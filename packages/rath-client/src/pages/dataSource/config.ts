import intl from 'react-intl-universal';
import { useMemo } from "react";
import { IDataSourceType } from "../../global";


export const useDataSourceTypeOptions = function (): Array<{ key: IDataSourceType; text: string }> {
    const fileText = intl.get(`dataSource.importData.type.${IDataSourceType.FILE}`);
    const restfulText = intl.get(`dataSource.importData.type.${IDataSourceType.RESTFUL}`);
    const demoText = intl.get(`dataSource.importData.type.${IDataSourceType.DEMO}`)
    const localText = intl.get('common.history');
    const dbText = intl.get(`dataSource.importData.type.${IDataSourceType.DATABASE}`);

    const options = useMemo<Array<{ key: IDataSourceType; text: string }>>(() => {
        return [
            {
                key: IDataSourceType.FILE,
                text: fileText,
                iconProps: { iconName: "ExcelDocument" },
            },
            {
                key: IDataSourceType.LOCAL,
                text: localText,
                iconProps: { iconName: "FabricUserFolder" },
                disabled: false,
            },
            {
                key: IDataSourceType.DEMO,
                text: demoText,
                iconProps: { iconName: "FileTemplate" },
            },
            {
                key: IDataSourceType.RESTFUL,
                text: restfulText,
                iconProps: { iconName: "Cloud" },
            },
            {
                key: IDataSourceType.DATABASE,
                text: dbText,
                iconProps: { iconName: "Database" }
            },
            {
                key: IDataSourceType.OLAP,
                text: 'OLAP',
                iconProps: { iconName: "TripleColumn" },
                disabled: false,
            },
            {
                key: IDataSourceType.AIRTABLE,
                text: 'AirTable',
                iconProps: { iconName: 'Table' },
                disabled: false
            },
        ];
    }, [fileText, restfulText, demoText, localText, dbText]);
    return options;
};

export const DemoDataAssets = process.env.NODE_ENV === 'production' ? {
    CARS: "https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-cars-service.json",
    STUDENTS: "https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-students-service.json",
    BTC_GOLD: "https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds_btc_gold_service.json",
    BIKE_SHARING: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-bikesharing-service.json',
    CAR_SALES: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-carsales-service.json',
    COLLAGE: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-collage-service.json',
    TITANIC: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-titanic-service.json',
    KELPER: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-kelper-service.json',
    BIKE_SHARING_DC: 'https://chspace.oss-cn-hongkong.aliyuncs.com/api/bike_dc-dataset-service.json'
} : {
    // CARS: "https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-cars-service.json",
    CARS: "/datasets/ds-cars-service.json",
    // CARS: "/datasets/dataset-service-edge.json",
    // STUDENTS: "https://chspace.oss-cn-hongkong.aliyuncs.com/api/ds-students-service.json",
    STUDENTS: "/datasets/ds-students-service.json",
    BTC_GOLD: "/datasets/ds_btc_gold_service.json",
    BIKE_SHARING: '/datasets/ds-bikesharing-service.json',
    CAR_SALES: '/datasets/ds-carsales-service.json',
    COLLAGE: '/datasets/ds-collage-service.json',
    TITANIC: '/datasets/ds-titanic-service.json',
    KELPER: '/datasets/ds-kelper-service.json',
    BIKE_SHARING_DC: '/datasets/bike_dc-dataset-service.json'
} as const;

export type IDemoDataKey = keyof typeof DemoDataAssets;

export const useDemoDataOptions = function (): Array<{key: IDemoDataKey; text: string}> {
    const options = useMemo<Array<{ key: IDemoDataKey; text: string }>>(() => {
        return [
            {
                key: "CARS",
                text: "Cars",
            },
            {
                key: "STUDENTS",
                text: "Students' Performance"
            },
            {
                key: 'BIKE_SHARING_DC',
                text: 'Bike Sharing in Washington D.C.'
            },
            {
                key: "CAR_SALES",
                text: "Car Sales"
            },
            {
                key: "COLLAGE",
                text: "Collage"
            },
            {
                key: "KELPER",
                text: "NASA Kelper"
            },
            {
                key: 'BTC_GOLD',
                text: "2022MCM Problem C: Trading Strategies"
            },
            {
                key: "TITANIC",
                text: "Titanic"
            }
        ];
    }, []);
    return options;
}

export const SEMANTIC_TYPE_CHOICES: {key: string; text: string }[] = [
    { key: 'nominal', text: 'nominal' },
    { key: 'ordinal', text: 'ordinal' },
    { key: 'temporal', text: 'temporal' },
    { key: 'quantitative', text: 'quantitative' },
]

export const ANALYTIC_TYPE_CHOICES: {key: string; text: string }[] = [
    { key: 'dimension', text: 'dimension' },
    { key: 'measure', text: 'measure' },
]