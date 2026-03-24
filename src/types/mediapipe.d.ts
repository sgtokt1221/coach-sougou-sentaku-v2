declare module "@mediapipe/tasks-vision" {
  export interface FilesetResolverType {
    forVisionTasks(wasmPath: string): Promise<unknown>;
  }

  export const FilesetResolver: FilesetResolverType;

  export interface FaceLandmarkerOptions {
    baseOptions: {
      modelAssetPath: string;
      delegate?: "GPU" | "CPU";
    };
    runningMode: "VIDEO" | "IMAGE";
    numFaces?: number;
    outputFaceBlendshapes?: boolean;
    outputFacialTransformationMatrixes?: boolean;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: Array<Array<{ x: number; y: number; z: number }>>;
  }

  export interface FaceLandmarkerInstance {
    detectForVideo(video: HTMLVideoElement, timestamp: number): FaceLandmarkerResult;
    close(): void;
  }

  export const FaceLandmarker: {
    createFromOptions(
      vision: unknown,
      options: FaceLandmarkerOptions
    ): Promise<FaceLandmarkerInstance>;
  };
}
