import { registerRoot } from 'remotion'
import { Composition } from 'remotion'
import React from 'react'
import { VideoComposition } from './VideoComposition'

const Root: React.FC = () => {
    return (
        <Composition
            id="AgentCineVideo"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            component={VideoComposition as any}
            durationInFrames={300}
            fps={30}
            width={1920}
            height={1080}
            defaultProps={{
                clips: [],
                bgmTrack: [],
                config: { fps: 30, width: 1920, height: 1080 }
            }}
        />
    )
}

registerRoot(Root)
