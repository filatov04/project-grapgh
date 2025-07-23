import { api } from './customAxiosInstance';
import type { CommentInterface } from '../types/markupTypes';

const getMarkup = async (fileHash: string) => {
  return api.get<CommentInterface[]>(`/markup/${fileHash}`);
}
const postMarkup = async (fileHash: string, comments: CommentInterface[]) => {
  return api.post(`/markup/${fileHash}`, comments);
}

export { getMarkup, postMarkup };