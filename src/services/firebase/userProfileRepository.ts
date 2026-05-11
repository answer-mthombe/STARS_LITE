import { doc, getDoc } from "firebase/firestore";

import { getFirebaseDb } from "@/firebase/app";
import { COLLECTIONS } from "@/firebase/collections";
import { userProfileConverter } from "@/firebase/converters";
import type { FirebaseUserProfileDoc } from "@/types/firebaseUserProfile";

export async function getUserProfileByUid(uid: string): Promise<FirebaseUserProfileDoc | null> {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.userProfiles, uid).withConverter(userProfileConverter);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}
