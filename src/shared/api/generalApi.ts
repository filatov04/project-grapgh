import { api } from './customAxiosInstance';

const getAllObjects = async () => {
  return api.get<string[]>('/objects');
}

const getAllPredicates = async () => {
  return api.get<string[]>('/predicates');
}

const getAllSubjects = async () => {
  return api.get<string[]>('/subjects');
}

const postPredicate = async (predicate: string) => {
  return api.post('/predicates', { predicate });
}

const postObject = async (object: string) => {
  return api.post('/objects', { object });
}

export { getAllObjects, getAllPredicates, getAllSubjects, postPredicate, postObject };