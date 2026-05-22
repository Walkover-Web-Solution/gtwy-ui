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

const extractImageUrlsFromResponse = (parsed) => {
  let rawImages = [];
  if (parsed.response?.data?.image_urls && Array.isArray(parsed.response.data.image_urls)) {
    rawImages = parsed.response.data.image_urls
      .map((imageObj) => {
        return imageObj.permanent_url || imageObj.image_url || imageObj;
      })
      .filter(Boolean);
  }
  return buildLlmUrls(rawImages, []);
};

export {
  getUrlIdentifier,
  haveSameItems,
  createUserUrlEntry,
  buildUserUrls,
  createLlmUrlEntry,
  buildLlmUrls,
  extractImageUrlsFromResponse,
};
