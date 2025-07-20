class PredicateManager {
    private static instance: PredicateManager;
    private predicates: Set<string>;
    private systemPredicates: Set<string>;

    private constructor() {  // Исправлено: constructor вместо constractor
        this.predicates = new Set();
        this.systemPredicates = new Set([
            'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
            'http://www.w3.org/2000/01/rdf-schema#subClassOf',
        ]);
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
        if (!this.systemPredicates.has(predicate)) {
            this.predicates.add(predicate);
        }
    }

    public registerSystemPredicate(predicate: string): void {
        this.systemPredicates.add(predicate);
    }

    public getAllPredicates(): string[] {
        return [
            ...Array.from(this.systemPredicates),
            ...Array.from(this.predicates)
        ].sort();
    }

    public getUserDefinedPredicates(): string[] {
        return Array.from(this.predicates).sort();
    }

    public getSystemPredicates(): string[] {
        return Array.from(this.systemPredicates).sort();
    }

    public isSystemPredicate(predicate: string): boolean {
        return this.systemPredicates.has(predicate);
    }
}

export default PredicateManager.getInstance();