"use client";

/**
 * useRecipeStorage Hook
 *
 * Manages IndexedDB operations for local recipe storage.
 * Implements LRU eviction to maintain max 50 recipes.
 * Provides CRUD operations with error handling.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { ParsedIngredientDTO } from "@/types";
import { type RecentRecipe, RECIPES_DB_CONFIG, RECIPES_STRINGS, extractDomain } from "../types";

// =============================================================================
// Types
// =============================================================================

interface UseRecipeStorageReturn {
  /** List of recent recipes sorted by last_accessed_at descending */
  recipes: RecentRecipe[];
  /** Loading state for initial data fetch */
  isLoading: boolean;
  /** Error message if any operation failed */
  error: string | null;
  /** Save a new recipe and return its ID */
  saveRecipe: (recipe: NewRecipeData) => Promise<string>;
  /** Delete a recipe by ID */
  deleteRecipe: (id: string) => Promise<void>;
  /** Get a single recipe by ID */
  getRecipe: (id: string) => Promise<RecentRecipe | null>;
  /** Update last_accessed_at timestamp for a recipe */
  updateLastAccessed: (id: string) => Promise<void>;
  /** Clear all recipes from storage */
  clearAll: () => Promise<void>;
}

/** Data required to create a new recipe */
export interface NewRecipeData {
  title: string;
  source_url: string;
  ingredients: ParsedIngredientDTO[];
  parsing_confidence: number;
}

// =============================================================================
// IndexedDB Helper Functions
// =============================================================================

/**
 * Opens IndexedDB connection with proper version handling
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if IndexedDB is available
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(RECIPES_DB_CONFIG.name, RECIPES_DB_CONFIG.version);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(RECIPES_DB_CONFIG.storeName)) {
        const store = db.createObjectStore(RECIPES_DB_CONFIG.storeName, {
          keyPath: "id",
        });

        // Create indexes for efficient querying
        store.createIndex("created_at", "created_at", { unique: false });
        store.createIndex("last_accessed_at", "last_accessed_at", { unique: false });
      }
    };
  });
}

/**
 * Wraps an IDBRequest in a Promise
 */
function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Wraps an IDBTransaction completion in a Promise
 */
function promisifyTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error("Transaction aborted"));
  });
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useRecipeStorage(): UseRecipeStorageReturn {
  const [recipes, setRecipes] = useState<RecentRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the database connection
  const dbRef = useRef<IDBDatabase | null>(null);

  /**
   * Get database connection (opens if not already open)
   */
  const getDb = useCallback(async (): Promise<IDBDatabase> => {
    if (dbRef.current) {
      return dbRef.current;
    }

    const db = await openDatabase();
    dbRef.current = db;

    // Clean up on close
    db.onclose = () => {
      dbRef.current = null;
    };

    return db;
  }, []);

  /**
   * Fetch all recipes from IndexedDB, sorted by last_accessed_at descending
   */
  const fetchRecipes = useCallback(async (): Promise<RecentRecipe[]> => {
    const db = await getDb();
    const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readonly");
    const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);
    const index = store.index("last_accessed_at");

    // Get all recipes using cursor to iterate in order
    const allRecipes: RecentRecipe[] = [];

    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, "prev"); // Descending order

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (cursor) {
          allRecipes.push(cursor.value as RecentRecipe);
          cursor.continue();
        } else {
          resolve(allRecipes);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }, [getDb]);

  /**
   * Load recipes on mount
   */
  useEffect(() => {
    let mounted = true;

    const loadRecipes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedRecipes = await fetchRecipes();

        if (mounted) {
          setRecipes(loadedRecipes);
        }
      } catch (err) {
        console.error("Failed to load recipes from IndexedDB:", err);
        if (mounted) {
          setError(RECIPES_STRINGS.errors.storageError);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadRecipes();

    return () => {
      mounted = false;
    };
  }, [fetchRecipes]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (dbRef.current) {
        dbRef.current.close();
        dbRef.current = null;
      }
    };
  }, []);

  /**
   * Evict oldest recipes when exceeding max limit (LRU)
   */
  const evictOldestRecipes = useCallback(async (db: IDBDatabase, currentCount: number): Promise<void> => {
    const recipesToEvict = currentCount - RECIPES_DB_CONFIG.maxRecipes + 1; // +1 for the new one being added

    if (recipesToEvict <= 0) return;

    const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readwrite");
    const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);
    const index = store.index("last_accessed_at");

    // Get oldest recipes to delete
    const idsToDelete: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const request = index.openCursor(null, "next"); // Ascending order (oldest first)
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;

        if (cursor && count < recipesToEvict) {
          idsToDelete.push((cursor.value as RecentRecipe).id);
          count++;
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });

    // Delete the oldest recipes
    for (const id of idsToDelete) {
      store.delete(id);
    }

    await promisifyTransaction(transaction);
  }, []);

  /**
   * Save a new recipe to IndexedDB
   */
  const saveRecipe = useCallback(
    async (data: NewRecipeData): Promise<string> => {
      try {
        const db = await getDb();

        // Check current count and evict if necessary
        const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readonly");
        const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);
        const count = await promisifyRequest(store.count());

        if (count >= RECIPES_DB_CONFIG.maxRecipes) {
          await evictOldestRecipes(db, count);
        }

        // Generate new recipe
        const now = new Date().toISOString();
        const newRecipe: RecentRecipe = {
          id: crypto.randomUUID(),
          title: data.title,
          source_url: data.source_url,
          source_domain: extractDomain(data.source_url),
          ingredients: data.ingredients,
          parsing_confidence: data.parsing_confidence,
          created_at: now,
          last_accessed_at: now,
        };

        // Save to IndexedDB
        const writeTransaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readwrite");
        const writeStore = writeTransaction.objectStore(RECIPES_DB_CONFIG.storeName);
        writeStore.add(newRecipe);

        await promisifyTransaction(writeTransaction);

        // Update local state
        setRecipes((prev) => [newRecipe, ...prev].slice(0, RECIPES_DB_CONFIG.maxRecipes));

        return newRecipe.id;
      } catch (err) {
        console.error("Failed to save recipe:", err);
        throw new Error(RECIPES_STRINGS.errors.storageError);
      }
    },
    [getDb, evictOldestRecipes]
  );

  /**
   * Delete a recipe from IndexedDB
   */
  const deleteRecipe = useCallback(
    async (id: string): Promise<void> => {
      try {
        const db = await getDb();
        const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readwrite");
        const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);

        store.delete(id);
        await promisifyTransaction(transaction);

        // Update local state
        setRecipes((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error("Failed to delete recipe:", err);
        throw new Error(RECIPES_STRINGS.errors.storageError);
      }
    },
    [getDb]
  );

  /**
   * Get a single recipe by ID
   */
  const getRecipe = useCallback(
    async (id: string): Promise<RecentRecipe | null> => {
      try {
        const db = await getDb();
        const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readonly");
        const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);

        const result = await promisifyRequest(store.get(id));
        return result ?? null;
      } catch (err) {
        console.error("Failed to get recipe:", err);
        return null;
      }
    },
    [getDb]
  );

  /**
   * Update last_accessed_at timestamp for a recipe
   */
  const updateLastAccessed = useCallback(
    async (id: string): Promise<void> => {
      try {
        const db = await getDb();
        const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readwrite");
        const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);

        // Get current recipe
        const recipe = await promisifyRequest(store.get(id));

        if (!recipe) return;

        // Update timestamp
        const updatedRecipe: RecentRecipe = {
          ...recipe,
          last_accessed_at: new Date().toISOString(),
        };

        store.put(updatedRecipe);
        await promisifyTransaction(transaction);

        // Update local state and re-sort
        setRecipes((prev) => {
          const updated = prev.map((r) => (r.id === id ? updatedRecipe : r));
          return updated.sort(
            (a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime()
          );
        });
      } catch (err) {
        console.error("Failed to update last accessed:", err);
        // Silently fail for this non-critical operation
      }
    },
    [getDb]
  );

  /**
   * Clear all recipes from storage
   */
  const clearAll = useCallback(async (): Promise<void> => {
    try {
      const db = await getDb();
      const transaction = db.transaction(RECIPES_DB_CONFIG.storeName, "readwrite");
      const store = transaction.objectStore(RECIPES_DB_CONFIG.storeName);

      store.clear();
      await promisifyTransaction(transaction);

      setRecipes([]);
    } catch (err) {
      console.error("Failed to clear recipes:", err);
      throw new Error(RECIPES_STRINGS.errors.storageError);
    }
  }, [getDb]);

  return {
    recipes,
    isLoading,
    error,
    saveRecipe,
    deleteRecipe,
    getRecipe,
    updateLastAccessed,
    clearAll,
  };
}
