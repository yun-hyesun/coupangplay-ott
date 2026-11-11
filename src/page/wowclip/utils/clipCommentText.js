export const CLIP_COMMENT_LIMIT = 300;
export const clipCommentLength = (text) => Array.from(text).length;

export const normalizeClipComment = (text) => {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) throw new Error('댓글 내용을 입력해 주세요.');
  if (clipCommentLength(value) > CLIP_COMMENT_LIMIT) {
    throw new Error(`댓글은 ${CLIP_COMMENT_LIMIT}자 이내로 작성해 주세요.`);
  }
  return value;
};
