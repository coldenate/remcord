export interface Activity {
	type: 0;
	application_id: '1083778386708676728';
	name: string;
	details: string;
	state: string;
	assets:
		| undefined
		| {
				large_image?: string | undefined;
				large_text?: string | undefined;
				small_image?: string | undefined;
				small_text?: string | undefined;
		  };
	platform: 'ios' | 'android' | 'desktop';
}

export interface UserToken {
	access_token: string;
	expires_in: number;
	refresh_token: string;
	scope: string[];
	token_type: string;
	expires_at: number;
}

export interface Interaction {
	token: UserToken;
	activity?: Activity;
	session_id?: string;
}

export type rpcSetting =
	| 'app-name'
	| 'queue-details'
	| 'queue-state'
	| 'queue-large-text'
	| 'queue-small-text'
	| 'editing-details'
	| 'editing-state'
	| 'editing-large-text'
	| 'editing-small-text'
	| 'idle-details'
	| 'idle-state'
	| 'idle-large-text'
	| 'idle-small-text';
