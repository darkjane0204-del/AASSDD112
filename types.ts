
export enum GenerationMode {
  LOCAL_EDIT = 'LOCAL_EDIT',
  PERSPECTIVE = 'PERSPECTIVE',
  SCENE_SWAP = 'SCENE_SWAP',
  COMPREHENSIVE = 'COMPREHENSIVE'
}

export interface ModificationResult {
  id: string;
  url: string;
  mode: GenerationMode;
  promptUsed: string;
  timestamp: number;
}

export interface ModificationTask {
  originalImage: string;
  prompt: string;
  regionHint?: string;
  perspectiveAngle?: string;
  sceneType?: string;
  intensity: number;
}

export interface AppState {
  originalImage: string | null;
  results: ModificationResult[];
  isGenerating: boolean;
  history: ModificationResult[];
  error: string | null;
  currentTask: ModificationTask;
}
