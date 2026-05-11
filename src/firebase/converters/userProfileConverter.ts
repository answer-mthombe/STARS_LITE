import { idBasedConverter } from "./idBasedConverter";
import type { FirebaseUserProfileDoc } from "@/types/firebaseUserProfile";

export const userProfileConverter = idBasedConverter<FirebaseUserProfileDoc>();
