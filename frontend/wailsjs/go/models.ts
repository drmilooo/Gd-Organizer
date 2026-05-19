export namespace frontend {
	
	export class FileFilter {
	    DisplayName: string;
	    Pattern: string;
	
	    static createFrom(source: any = {}) {
	        return new FileFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.DisplayName = source["DisplayName"];
	        this.Pattern = source["Pattern"];
	    }
	}

}

export namespace main {
	
	export class GameAnalysis {
	    hasGeode: boolean;
	    version: string;
	    isGDPS: boolean;
	    exeName: string;
	    customLogo: string;
	
	    static createFrom(source: any = {}) {
	        return new GameAnalysis(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hasGeode = source["hasGeode"];
	        this.version = source["version"];
	        this.isGDPS = source["isGDPS"];
	        this.exeName = source["exeName"];
	        this.customLogo = source["customLogo"];
	    }
	}
	export class LaunchResult {
	    success: boolean;
	    error: string;
	
	    static createFrom(source: any = {}) {
	        return new LaunchResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class ModInfo {
	    id: string;
	    name: string;
	    enabled: boolean;
	    version: string;
	    description: string;
	    file: string;
	    dependencies: string[];
	
	    static createFrom(source: any = {}) {
	        return new ModInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.enabled = source["enabled"];
	        this.version = source["version"];
	        this.description = source["description"];
	        this.file = source["file"];
	        this.dependencies = source["dependencies"];
	    }
	}

}

