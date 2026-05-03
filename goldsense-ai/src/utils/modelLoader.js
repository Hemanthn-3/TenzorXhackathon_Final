export const loadMobileNet = async () => {
  const mobilenet = await import('@tensorflow-models/mobilenet');
  await import('@tensorflow/tfjs');
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });
  return model;
};

export const loadCocoSsd = async () => {
  const cocoSsd = await import('@tensorflow-models/coco-ssd');
  await import('@tensorflow/tfjs');
  const model = await cocoSsd.load();
  return model;
};

export const loadClipClassifier = async () => {
  const { pipeline } = await import('@huggingface/transformers');
  const classifier = await pipeline(
    'zero-shot-image-classification',
    'Xenova/clip-vit-base-patch32'
  );
  return classifier;
};

export const loadOCRModel = async () => {
  const { pipeline } = await import('@huggingface/transformers');
  const ocr = await pipeline(
    'image-to-text',
    'Xenova/trocr-small-printed'
  );
  return ocr;
};
