import type { FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";

/**
 * Generic converter: document id lives in the `id` field on the client model;
 * Firestore document body should not duplicate `id` in stored fields.
 */
export function idBasedConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T) {
      const { id: _id, ...rest } = model as T & Record<string, unknown>;
      return rest as Omit<T, "id">;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options);
      return { id: snapshot.id, ...data } as T;
    },
  };
}
