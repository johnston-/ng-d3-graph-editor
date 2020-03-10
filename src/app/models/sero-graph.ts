
interface SeroNode {
	id: string,
	type: string,
	value: string,
	assessment_type?: string,
	x: number,
	y: number,
	fx: number,
	fy: number,
	height: number,
	width: number,
	[propName: string]: any
}

interface SeroLink {
	id:string,
	source: string,
	target: string,
	triple_ids: string[],
	[propName: string]: any
}


interface ItemData {
	id: string,
	type: string,
	[propName: string]: any
}

interface LaunchPageData {
	message: string,
	items: ItemData[]
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