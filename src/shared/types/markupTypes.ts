export interface CommentInterface {
  id: number;
  startIndex: number;
  endIndex: number;
  subject: string;
  predicate: string;
  object: string; // The highlighted text
  createdAt?: Date;
  author?: string;
}