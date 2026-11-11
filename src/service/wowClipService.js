import { auth, db } from '../firebase/firebase';
import { createWowClipRepository } from '../page/wowclip/data/wowClipRepository';

export const wowClipService = createWowClipRepository({ database: db, currentUser: () => auth.currentUser });
