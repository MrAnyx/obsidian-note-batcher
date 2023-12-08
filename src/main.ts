import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
} from "obsidian";
import { getAPI } from "obsidian-dataview";
import { FolderInputSuggester } from "./settings/FolderInputSuggester";
import { DEFAULT_SETTINGS } from "./settings/settings";
import { InvalidLlinkModal } from "./modal";
import { InvalidLink, PluginSettings } from "./types.d";

export default class NoteBatcherPlugin extends Plugin {
	settings: PluginSettings;

	getExtension(path: string): string | undefined {
		if (path.contains(".")) {
			return path.split(".").last();
		}

		return undefined;
	}

	isDataviewEnabled(): boolean {
		return !!getAPI(this.app);
	}

	isFolderPathValid(path: string): boolean {
		return !!this.app.vault.getAbstractFileByPath(path ? path : "/");
	}

	getDefaultFolder(): string | undefined {
		const rootPath = this.settings.defaultLocation;

		if (this.isFolderPathValid(rootPath)) {
			return rootPath;
		} else {
			return;
		}
	}

	async batchCreate() {
		if (!this.isDataviewEnabled()) {
			new Notice(
				"You must install and enable the Dataview plugin first."
			);
			return;
		}

		const dv = getAPI(this.app);
		const defaultFolder = this.getDefaultFolder();

		if (defaultFolder === undefined) {
			new Notice(
				`Default location "${this.settings.defaultLocation}" doesn't exist. You must modify the settings.`
			);
			return;
		}

		let ok = 0;
		let nok: InvalidLink[] = [];
		const pages: any[] = dv.pages();

		// For each page
		for (let i = 0; i < pages.length; i++) {
			const page = pages[i];
			const outlinks = page.file.outlinks.values;

			// For each outgoing link of each page
			for (let j = 0; j < outlinks.length; j++) {
				const outlink = outlinks[j];
				const fileExist = !!dv.page(outlink.path)?.files;
				const hasExtension = !!this.getExtension(outlink.path);

				if (!fileExist && !hasExtension) {
					await this.app.vault
						.create(`${defaultFolder}/${outlink.path}.md`, "")
						.then((file: TFile) => ok++)
						.catch((err) => {
							if (!nok.some((e) => e.to === outlink.path)) {
								nok.push({
									from: {
										folder: page.file.folder,
										filename: page.file.name,
									},
									to: outlink.path,
								});
							}
						});
				}
			}
		}

		console.log(nok);

		new Notice(
			`Created ${ok} notes out of ${nok.length + ok} unresolved links.`
		);

		if (nok.length > 0) {
			new InvalidLlinkModal(this.app, nok).open();
		}
	}

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon(
			"link",
			"Create unresolved notes",
			(evt: MouseEvent) => {
				this.batchCreate();
			}
		);

		this.addCommand({
			id: "create-unresolved-notes",
			name: "Create unresolved notes",
			callback: () => {
				this.batchCreate();
			},
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingTab extends PluginSettingTab {
	plugin: NoteBatcherPlugin;

	constructor(app: App, plugin: NoteBatcherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(this.containerEl)
			.setName("New note location")
			.setDesc(
				"Folder that will contain all new notes. Empty value is equivalent to the vault root."
			)
			.addSearch((cb) => {
				new FolderInputSuggester(this.app, cb.inputEl);
				cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.defaultLocation)
					.onChange((newFolder) => {
						this.plugin.settings.defaultLocation = newFolder;
						this.plugin.saveSettings();
					});
			});

		new Setting(this.containerEl).setDesc(
			"If you use a template plugin like Templater with folder templates, the folder template will be applied."
		);
	}
}
