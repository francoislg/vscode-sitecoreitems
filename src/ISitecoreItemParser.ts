export interface ISitecoreItemConfiguration {
    version: number;
    id: string;
    database: string;
    path: string;
    name: string;

    fields: IFieldConfiguration[];
}

export interface IFieldConfiguration {
    sectionOriginalLine: number;
    name: string;
    key: string;
    contentLength: number;
    value: string;
}

export interface ISitecoreItemFormatParser {
    parse(text: string): Promise<ISitecoreItemConfiguration>;
}
