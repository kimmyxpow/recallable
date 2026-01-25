import { atomWithStorage } from "jotai/utils";

export const lastOpenedNoteAtom = atomWithStorage<string | null>(
  "recallable:lastOpenedNote",
  null
);

export const lastFolderAtom = atomWithStorage<string | null>(
  "recallable:lastFolder",
  null
);
