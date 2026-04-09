import { Composition } from "remotion";
import { IntroVideo } from "./IntroVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CoachIntro"
        component={IntroVideo}
        durationInFrames={2956} // ~98.5 seconds at 30fps
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
