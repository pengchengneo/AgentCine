export const STEP_LABEL_KEYS: Record<string, string> = {
  script_agent: 'stepScriptAgent',
  art_director_agent: 'stepArtDirector',
  storyboard_agent: 'stepStoryboardAgent',
  producer_quality_check: 'stepProducerQualityCheck',
}

export const AGENT_NAME_KEYS: Record<string, string> = {
  script: 'agentScript',
  art: 'agentArt',
  storyboard: 'agentStoryboard',
  review: 'agentProducer',
}

export const TASK_TYPE_KEYS: Record<string, string> = {
  analyze_novel: 'taskAnalyzeNovel',
  story_to_script_run: 'taskStoryToScript',
  script_to_storyboard_run: 'taskScriptToStoryboard',
  image_character: 'taskImageCharacter',
  image_location: 'taskImageLocation',
  image_panel: 'taskImagePanel',
  image_panel_variant: 'taskImagePanelVariant',
}
