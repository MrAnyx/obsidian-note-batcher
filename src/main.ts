import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, TFolder, Vault } from 'obsidian';
import { getAPI } from "obsidian-dataview";
import { FolderInputSuggester } from './Settings/FolderInputSuggester';

interface PluginSettings {
	defaultLocation: string;
}

const DEFAULT_SETTINGS: PluginSettings = {
	defaultLocation: "",
}

export default class NoteBatcherPlugin extends Plugin {
	settings: PluginSettings;

	getExtension(path: string): string | undefined {
		if(path.contains(".")) {
			return path.split(".").last();
		}

		return undefined;
	}

	isDataviewEnabled(): boolean {
		return !!getAPI(this.app)
	}

	isFolderPathValid(path: string): boolean {
		return !!this.app.vault.getAbstractFileByPath(!!path ? path : "/");
	}

	getDefaultFolder(): string | undefined {
		let rootPath = this.settings.defaultLocation;

		if (this.isFolderPathValid(rootPath)) {
			return rootPath;
		} else {
			return
		}
	}

	batchCreate() {
		if (!this.isDataviewEnabled()) {
			new Notice("You must install the Dataview plugin first.");
			return;
		}

		const dv = getAPI(this.app);
		const defaultFolder = this.getDefaultFolder();

		if(defaultFolder === undefined) {
			new Notice(`Default location \"${this.settings.defaultLocation}\" doesn't exist. You must modify the settings.`);
			return;
		}

		dv.pages().forEach((p: any) => {
			p.file.outlinks.values.forEach((o: any) => {
				const fileExist = !!dv.page(o.path)?.files
				const hasExtension = !!this.getExtension(o.path)

				if (!fileExist && !hasExtension) {
					this.app.vault.create(`${defaultFolder}/${o.path}.md`, "");
				}
			});
		});
	}

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon('link', 'Create unresolved notes', (evt: MouseEvent) => {
			this.batchCreate();
		});

		this.addCommand({
			id: 'create-unresolved-notes',
			name: 'Create unresolved notes',
			callback: () => {
				this.batchCreate();
			}
		});

		this.addSettingTab(new SettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
            .setDesc("Folder that will contain all new notes. Empty value is equivalent to the vault root.")
            .addSearch((cb) => {
				new FolderInputSuggester(this.app, cb.inputEl);
                cb.setPlaceholder("Example: folder1/folder2")
					.setValue(this.plugin.settings.defaultLocation)
					.onChange((newFolder) => {
						this.plugin.settings.defaultLocation = newFolder;
						this.plugin.saveSettings();
					});
			});

			new Setting(this.containerEl)
            	.setDesc("If you use a template plugin like Templater with folder templates, the folder template will be applied.");
            
	}
}
