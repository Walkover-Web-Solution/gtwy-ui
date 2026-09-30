const isWordFileUrl = (url) => typeof url === "string" && /\.docx?($|\?)/i.test(url);

const getUrlIdentifier = (item) => {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item?.url || item?.resolvedUrl || item?.permanent_url || "";
};

const haveSameItems = (first = [], second = []) => {
  if (!Array.isArray(first) || !Array.isArray(second)) return false;
  if (!first.length || !second.length) return false;
  if (first.length !== second.length) return false;
  return first.every((item, index) => getUrlIdentifier(item) === getUrlIdentifier(second[index]));
};

const createUserUrlEntry = (url, type) => {
  if (!url) return null;
  return {
    url,
    type,
    source: "user",
  };
};

const buildUserUrls = (images = [], files = []) => {
  const imageEntries = Array.isArray(images)
    ? images.map((url) => createUserUrlEntry(url, "image")).filter(Boolean)
    : [];
  const fileEntries = Array.isArray(files) ? files.map((url) => createUserUrlEntry(url, "pdf")).filter(Boolean) : [];
  return [...imageEntries, ...fileEntries];
};

const createLlmUrlEntry = (url, type) => {
  if (!url) return null;
  return {
    url,
    type,
    source: "llm",
  };
};

const buildLlmUrls = (images = [], files = []) => {
  const imageEntries = Array.isArray(images)
    ? images.map((url) => createLlmUrlEntry(url, "image")).filter(Boolean)
    : [];
  const fileEntries = Array.isArray(files) ? files.map((url) => createLlmUrlEntry(url, "pdf")).filter(Boolean) : [];
  return [...imageEntries, ...fileEntries];
};

const normalizeBackendLlmUrlEntry = (item) => {
  if (!item) return null;
  if (typeof item === "string") return createLlmUrlEntry(item, "image");
  const url = item.permanent_url || item.image_url || item.file_url || item.url;
  if (!url) return null;
  const type = item.type === "image" ? "image" : "pdf";
  return {
    url,
    type,
    filename: item.filename,
    source: "llm",
  };
};

const buildLlmUrlsFromBackend = (rawLlmUrls = []) =>
  Array.isArray(rawLlmUrls) ? rawLlmUrls.map(normalizeBackendLlmUrlEntry).filter(Boolean) : [];

const extractImageUrlsFromResponse = (parsed) => {
  const data = parsed.response?.data || {};

  let rawImages = [];
  if (Array.isArray(data.image_urls)) {
    rawImages = data.image_urls
      .map((imageObj) => {
        return imageObj.permanent_url || imageObj.image_url || imageObj;
      })
      .filter(Boolean);
  }

  const backendLlmUrls = buildLlmUrlsFromBackend(data.llm_urls);

  return [...buildLlmUrls(rawImages, []), ...backendLlmUrls];
};

export {
  isWordFileUrl,
  getUrlIdentifier,
  haveSameItems,
  createUserUrlEntry,
  buildUserUrls,
  createLlmUrlEntry,
  buildLlmUrls,
  buildLlmUrlsFromBackend,
  extractImageUrlsFromResponse,
};
