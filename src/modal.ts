import { App, Modal } from "obsidian";
import { InvalidLink } from "./types";

export class InvalidLlinkModal extends Modal {
	private nok: InvalidLink[];

	constructor(app: App, nok: InvalidLink[]) {
		super(app);
		this.nok = nok;
		this.modalEl.classList.add("note-batcher-modal-el");
		this.containerEl.classList.add("note-batcher-modal-container-el");
		this.titleEl.classList.add("note-batcher-modal-title-el");
		this.contentEl.classList.add("note-batcher-modal-content-el");
	}

	onOpen() {
		this.titleEl.createEl("h1", {
			text: "Links to review",
			cls: ["note-batcher-modal-title", "modal-title"],
		});

		const linksContainer = this.contentEl.createEl("div", {
			cls: ["note-batcher-modal-links-container"],
		});

		this.nok.forEach((n) => {
			const el = linksContainer.createDiv({
				cls: "note-batcher-modal-link",
				text: n.to,
			});
		});
	}

	onClose() {
		let { contentEl } = this;
		contentEl.empty();
	}
}
