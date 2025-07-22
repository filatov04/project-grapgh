class PredicateManager {
    private static instance: PredicateManager;
    private predicates: Set<string>;
    

    private constructor() {  
        this.predicates = new Set();

    }

    public static getInstance(): PredicateManager {
        if (!PredicateManager.instance) {
            PredicateManager.instance = new PredicateManager();
        }
        return PredicateManager.instance;
    }

    public clear(): void {
    this.predicates.clear();
    
  }
    public registerPredicate(predicate: string): void {
        if (!this.predicates.has(predicate)) {
            this.predicates.add(predicate);
        }
    }

    public getAllPredicates(): string[] {
        return Array.from(this.predicates).sort();
    }

}

export default PredicateManager.getInstance();