import { api } from './customAxiosInstance';
import type { CommentInterface } from '../types/markupTypes';

// const baseURL = '/api/v1/api/v1/comments';
const getMarkup = async (fileHash: string) => {
  return api.get<CommentInterface[]>(fileHash);
}
const postMarkup = async (fileHash: string, comments: CommentInterface[]) => {
  return api.post(fileHash, comments);
}

export { getMarkup, postMarkup };