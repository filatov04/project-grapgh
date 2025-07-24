export interface CommentInterface {
  id: number;
  filename: string;
  startIndex: number;
  endIndex: number;
  subject: string;
  predicate: string;
  object: string; // The highlighted text
  createdAt: string;
  author: string;
}