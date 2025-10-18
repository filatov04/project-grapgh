export interface CommentInterface {
  id: number;
  filename: string;
  startIndex: number;
  endIndex: number;
  subject: string;
  predicate: string;
  object: string;
  createdAt: string;
  author: string;
}