import { ISitecoreItemConfiguration, ISitecoreItemFormatParser, IFieldConfiguration } from "./ISitecoreItemParser";

class SequentialLineReader {
    private index: number = 0;
    constructor(private lines: string[]) {}
    get currentIndex(): number {
        return this.index;
    }
    readLines(numberOfLines: number): string[] {
        const slice = this.lines.slice(this.index, this.index + numberOfLines);
        this.index += numberOfLines;
        return slice;
    }
    skipLines(toSkip: number = 1) {
        this.index += toSkip;
    }
    hasLinesLeft(): boolean {
        return this.index < this.lines.length;
    }
}

export class SerializedSitecoreItemFormatParser implements ISitecoreItemFormatParser {
    public parse(text: string): Promise<ISitecoreItemConfiguration> {
        const config: ISitecoreItemConfiguration = {
            version: 0,
            id: "invalid",
            database: "not found",
            path: "not found",
            name: "not found",
            fields: []
        };
        const linesReader: SequentialLineReader = new SequentialLineReader(text.split("\n"));

        const sections = {
            "item": () => {
                const lines = linesReader.readLines(10);
                config.id = lines[1].substring("id: ".length);
                config.database = lines[2].substring("database: ".length);
                config.path = lines[3].substring("path: ".length);
                config.name = lines[5].substring("name: ".length);
            },
            "version": () => {
                linesReader.skipLines(4);
            },
            "field": (originalLineIndex) => {
                const lines = linesReader.readLines(6);
                const field: IFieldConfiguration = {
                    sectionOriginalLine: originalLineIndex,
                    name: lines[1].substring("name: ".length),
                    key: lines[2].substring("key: ".length),
                    contentLength: Number.parseInt(lines[3].substring("content-length: ".length)),
                    value: lines[5].trim()
                };
                config.fields.push(field);
            }
        }
        const invalidSection = () => {
            console.log("The section read is not supported, skipping it.");
            linesReader.skipLines(1);
        };

        while (linesReader.hasLinesLeft()) {
            const currentLine: string = linesReader.readLines(1)[0];
            const currentLineIndex = linesReader.currentIndex;
            console.log(`Reading line ${currentLineIndex + 1}: ${currentLine}`);
            if (currentLine.startsWith("----")) {
                const sectionType: string = currentLine.substring(0, currentLine.length - 5).substring(4);
                (sections[sectionType] || invalidSection)(currentLineIndex);
            } else {
                console.log(`Line ${currentLineIndex + 1} is not a section, skipping the line`);
                linesReader.skipLines(1);
            }
        }

        return Promise.resolve(config);
    }
}
