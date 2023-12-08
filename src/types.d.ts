export type PluginSettings = {
	defaultLocation: string;
};

export type InvalidLink = {
	from: {
		folder: string;
		filename: string;
	};
	to: string;
};
