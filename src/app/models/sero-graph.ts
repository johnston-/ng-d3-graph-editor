interface LaunchPageData {
	
}

interface CompletePageData {
	
}

interface GraphPermissionData {
	
}

interface SequenceData {
	
}

export interface GraphConfigSchema {
	graphType: string,
	language: string,
	permissions: GraphPermissionData,
	launchPage: LaunchPageData,
	completePage: CompletePageData,
	sequence: SequenceData,
}