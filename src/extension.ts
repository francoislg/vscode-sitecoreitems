"use strict";

import * as vscode from "vscode";

import {
    SerializedSitecoreItemFormatParser
} from "./sitecoreItemParser";
import { TextEdit } from "vscode";
import { ISitecoreItemConfiguration, IFieldConfiguration } from "./ISitecoreItemParser";

export function activate(context: vscode.ExtensionContext): void {
    console.log("Activating sitecoreitem");

    const previewUri: vscode.Uri = vscode.Uri.parse("sitecoreitem-preview://authority/sitecoreitem-preview");

    class SitecoreItemContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

        public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
            return this.createPreview();
        }

        get onDidChange(): vscode.Event<vscode.Uri> {
            return this._onDidChange.event;
        }

        public update(uri: vscode.Uri): void {
            this._onDidChange.fire(uri);
        }

        private async createPreview(): Promise<string> {
            const editor: vscode.TextEditor = vscode.window.activeTextEditor;
            const content: string = editor.document.getText();
            const configuration: ISitecoreItemConfiguration = await this.extractConfigurationFromText(content);
            return this.renderItem(configuration);
        }

        private extractConfigurationFromText(text: string): Promise<ISitecoreItemConfiguration> {
            return new SerializedSitecoreItemFormatParser().parse(text);
        }

        private renderItem(configuration: ISitecoreItemConfiguration): string {
            return `
                <body>
                    <div>${configuration.name}</div>
                    <div>
                        ${configuration.fields.map(field => this.fieldElement(field)).join("")}
                    </div>
				</body>`;
        }

        private fieldElement(field: IFieldConfiguration): string {
            return `<div>${field.key} : ${field.value}</div>`;
        }
    }

    const provider: SitecoreItemContentProvider = new SitecoreItemContentProvider();
    const contentProvider: vscode.Disposable = vscode.workspace.registerTextDocumentContentProvider("sitecoreitem-preview", provider);

    vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
        if (e.document === vscode.window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });

    vscode.window.onDidChangeActiveTextEditor((e: vscode.TextEditor) => {
        if (e.document.languageId === "sitecoreitem") {
            provider.update(previewUri);
        }
    });

    const showPreviewCommand: vscode.Disposable = vscode.commands.registerTextEditorCommand("extension.showSitecoreItemPreview",
        (textEditor: vscode.TextEditor) => {
            if (textEditor.document.languageId === "sitecoreitem") {
                return vscode.commands.executeCommand("vscode.previewHtml",
                    previewUri,
                    vscode.ViewColumn.Two,
                    "Sitecore Item Preview").then((success) => {
                        console.log("Preview Successful");
                    }, (reason) => {
                        console.error(reason);
                        vscode.window.showErrorMessage(reason);
                    });
            } else {
                return vscode.window.showErrorMessage("The document is not a sitecoreitem type.");
            }
        });

    const onSaveSubscription: vscode.Disposable = vscode.workspace.onWillSaveTextDocument(e => {
        if (e.document.languageId === "sitecoreitem") {
            console.log("Now saving content-lengths");
            const parseChanges = async (text: string) => {
                try {
                    const config: ISitecoreItemConfiguration = await new SerializedSitecoreItemFormatParser().parse(text);
                    const changes: TextEdit[] = config.fields
                        .filter(field => field.contentLength !== field.value.length)
                        .map(field => {
                            const line: vscode.TextLine = e.document.lineAt(field.sectionOriginalLine + 3);
                            const newLine: string = `content-length: ${field.value.length}`;
                            return vscode.TextEdit.replace(line.range, newLine);
                        });
                    return changes;
                } catch(error) {
                    console.error(error);
                }
            }

            const text: string = e.document.getText();

            e.waitUntil(parseChanges(text));
        }
    });

    context.subscriptions.push(
        contentProvider,
        showPreviewCommand,
        onSaveSubscription
    );
}