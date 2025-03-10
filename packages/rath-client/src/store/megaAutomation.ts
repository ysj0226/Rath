import { IFieldEncode, IPattern } from '@kanaries/loa';
import { computed, makeAutoObservable, observable, runInAction, toJS } from 'mobx';
import { Specification, IInsightSpace, ISpec } from 'visual-insights';
import { STORAGE_FILE_SUFFIX } from '../constants';
import {  IResizeMode, IRow, ITaskTestMode, IVegaSubset, PreferencePanelConfig } from '../interfaces';
import { distVis } from '../queries/distVis';
import { labDistVis } from '../queries/labdistVis';
import { rathEngineService } from '../services/index';
import { isSetEqual } from '../utils';
import { RathStorageDump } from '../utils/storage';
import { LTSPipeLine } from './pipeLineStore/lts';


export interface IVizSpace extends IInsightSpace {
    schema: Specification;
    dataView: IRow[]
}

export const EXPLORE_VIEW_ORDER = {
    DEFAULT: 'default',
    FIELD_NUM: 'field_num',
    CARDINALITY: 'cardinality'
} as const;

interface IConstranints {
    fid: string;
    name?: string;
    state: number;
}

export class MegaAutomationStore {
    public pageIndex: number = 0;
    private ltsPipeLineStore: LTSPipeLine;
    public specForGraphicWalker: ISpec | undefined = undefined;
    public details: IInsightSpace[] = [];
    public assoListT1: IInsightSpace[] = []
    public assoListT2: IInsightSpace[] = []
    public showAsso: boolean = false;
    public showConstraints: boolean = false;
    public showPreferencePannel: boolean = false;
    public showSaveModal: boolean = false;
    public showSubinsights: boolean = false;
    public visualConfig: PreferencePanelConfig;
    public mainViewSpec: IVegaSubset | null = null;
    public mainViewPattern: IPattern | null = null;
    public orderBy: string = EXPLORE_VIEW_ORDER.DEFAULT;
    public nlgThreshold: number = 0.2;
    public vizMode: 'lite' | 'strict' = 'lite';
    public globalConstraints: {
        dimensions: Array<IConstranints>;
        measures: Array<IConstranints>
    }
    // public viewData: IRow[] = []
    constructor (ltsPipeLineStore: LTSPipeLine) {
        this.visualConfig = {
            aggregator: "sum",
            defaultAggregated: false,
            defaultStack: true,
            visMode: 'dist',
            zoom: false,
            debug: false,
            resize: IResizeMode.auto,
            resizeConfig: {
                width: 320,
                height: 320
            },
            nlg: false,
            excludeScaleZero: false,
        };
        this.globalConstraints = {
            dimensions: [],
            measures: []
        }
        makeAutoObservable(this, {
            specForGraphicWalker: observable.ref,
            details: observable.ref,
            assoListT1: observable.ref,
            assoListT2: observable.ref,
            insightSpaces: computed,
            mainViewSpec: observable.ref,
            // @ts-expect-error private field
            ltsPipeLineStore: false
        });
        this.ltsPipeLineStore = ltsPipeLineStore;
    }
    public get insightSpaces () {
        const cloneSpaces = [...this.ltsPipeLineStore.insightSpaces];
        if (this.orderBy === EXPLORE_VIEW_ORDER.FIELD_NUM) {
            cloneSpaces.sort((a, b) => {
                return a.dimensions.length + a.measures.length - b.dimensions.length - b.measures.length
            })
        } else if (this.orderBy === EXPLORE_VIEW_ORDER.CARDINALITY) {
            cloneSpaces.sort((a, b) => {
                let cardOfA = 0;
                let cardOfB = 0;
                // TODO: This is an non-accurate cardinalitity estimate.
                // should get the correct number from OLAP query.
                // but it cost time.(need a discussion.)
                for (let dim of a.dimensions) {
                    const field = this.fields.find(f => f.key === dim)
                    if (field) {
                        cardOfA += field.features.unique;
                    }
                }
                for (let dim of b.dimensions) {
                    const field = this.fields.find(f => f.key === dim)
                    if (field) {
                        cardOfB += field.features.unique;
                    }
                }
                return cardOfA - cardOfB;
            })
        }
        return cloneSpaces
    }
    public get fields () {
        return this.ltsPipeLineStore.fields;
    }
    public get fieldMetas () {
        return this.ltsPipeLineStore.fieldMetas;
    }
    public get dataSource () {
        return this.ltsPipeLineStore.dataSource
    }
    public get samplingDataSource () {
        return this.ltsPipeLineStore.samplingDataSource;
    }
    public galleryPageIndex: number = 10;
    public setGalleryPageIndex (index: number) {
        this.galleryPageIndex = index;
    }
    public get galleryViewList () {
        const PAGE_SIZE = 5;
        const { pageIndex, insightSpaces } = this;
        return insightSpaces.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
    }
    public get gallerySpecList () {
        const { visualConfig, vizMode, galleryViewList, fieldMetas } = this;
        return galleryViewList.map(view => {
            const fields = fieldMetas.filter(m => view.dimensions.includes(m.fid) || view.measures.includes(m.fid))
            const pattern = {
                fields,
                imp: view.score || 0
            };
            if (vizMode === 'strict') {
                return labDistVis({
                    resizeMode: visualConfig.resize,
                    pattern,
                    width: 200,
                    height: 160,
                    interactive: visualConfig.zoom,
                    dataSource: this.dataSource
                })
            }
            return distVis({
                resizeMode: visualConfig.resize,
                pattern,
                width: 200,
                height: 160,
                interactive: visualConfig.zoom,
                stepSize: 32
            })
        })
    }
    public setNlgThreshold (num: number) {
        this.nlgThreshold = num;
    }
    public setVizMode (mode: 'lite' | 'strict') {
        this.vizMode = mode;
        this.refreshMainViewSpec();
    }
    public setVisualConig (updater: (config: PreferencePanelConfig) => void) {
        runInAction(() => {
            updater(this.visualConfig)
        });
    }
    public setShowSubinsights (show: boolean) {
        this.showSubinsights = show;
    }
    public async setExploreOrder (orderBy: string) {
        this.orderBy = orderBy;
        this.emitViewChangeTransaction(this.pageIndex);
    }
    public jumpToView (viz: IInsightSpace) {
        const { insightSpaces } = this;
        const { dimensions, measures } = viz;
        for (let i = 0; i < insightSpaces.length; i++) {
            if (isSetEqual(dimensions, insightSpaces[i].dimensions) && isSetEqual(measures, insightSpaces[i].measures)) {
                this.emitViewChangeTransaction(i);
                break;
            }
        }
    }
    public setShowPreferencePannel(show: boolean) {
        this.showPreferencePannel = show;
    }
    public initConstraints () {
        const fields = this.ltsPipeLineStore.fieldMetas;
        this.globalConstraints.dimensions = fields.filter(f => f.analyticType === 'dimension')
            .map(f => ({
                fid: f.fid,
                name: f.name,
                state: 0
            }));
        this.globalConstraints.measures = fields.filter(f => f.analyticType === 'measure')
            .map(f => ({
                fid: f.fid,
                name: f.name,
                state: 0
            }));
    }
    public updateConstraints (ckey: 'dimensions' | 'measures', index: number) {
        if (index < this.globalConstraints[ckey].length) {
            this.globalConstraints[ckey][index].state = (this.globalConstraints[ckey][index].state + 1 + 1) % 3 - 1
        }
    }
    public async getViewData (dimensions: string[], measures: string[], ops: string[]) {
        try {
            const data = await rathEngineService({
                task: 'cube',
                props: {
                    dimensions,
                    measures,
                    aggregators: ops
                }
            })
            return data;
        } catch (error) {
            return []
        }
    }
    public initVisualConfigResize () {
        this.visualConfig.resize = IResizeMode.auto;
        this.visualConfig.resizeConfig.width = 320;
        this.visualConfig.resizeConfig.height = 320;
    }
    public createMainViewPattern (iSpace: IInsightSpace) {
        const viewFields = this.fieldMetas.filter(f => iSpace.dimensions.includes(f.fid) || iSpace.measures.includes(f.fid));
        this.mainViewPattern = {
            fields: viewFields,
            imp: iSpace.score || 0,
            encodes: []
        }
        return this.mainViewPattern;
    }
    public createMainViewSpec (pattern: IPattern) {
        const { visualConfig, vizMode } = this;
        if (vizMode === 'lite') {
            this.mainViewSpec = distVis({
                resizeMode: visualConfig.resize,
                pattern: toJS(pattern),
                width: visualConfig.resizeConfig.width,
                height: visualConfig.resizeConfig.height,
                interactive: visualConfig.zoom,
                stepSize: 32,
                excludeScaleZero: visualConfig.excludeScaleZero,
                specifiedEncodes: pattern.encodes
            })
        } else if (vizMode === 'strict') {
            this.mainViewSpec = labDistVis({
                resizeMode: visualConfig.resize,
                pattern: toJS(pattern),
                width: visualConfig.resizeConfig.width,
                height: visualConfig.resizeConfig.height,
                interactive: visualConfig.zoom,
                stepSize: 32,
                dataSource: this.dataSource,
                excludeScaleZero: visualConfig.excludeScaleZero,
                specifiedEncodes: pattern.encodes
            })
        }
    }
    public refreshMainViewSpec () {
        if (this.mainViewPattern) {
            this.createMainViewSpec(this.mainViewPattern)
        }
    }
    public addFieldEncode2MainViewPattern (encode: IFieldEncode) {
        if (this.mainViewPattern) {
            if (!this.mainViewPattern.encodes) {
                this.mainViewPattern.encodes = [];
            }
            this.mainViewPattern.encodes.push(encode)
        }
    }
    public removeFieldEncodeFromMainViewPattern (encode: IFieldEncode) {
        if (this.mainViewPattern) {
            if (!this.mainViewPattern.encodes) {
                this.mainViewPattern.encodes = [];
            }
            this.mainViewPattern.encodes = this.mainViewPattern.encodes.filter(e => e.field !== encode.field)
        }
    }
    public addField2MainViewPattern (fid: string) {
        const targetField = this.fieldMetas.find(f => f.fid === fid);
        if (targetField && this.mainViewPattern) {
            this.mainViewPattern.fields.push(targetField);
            this.createMainViewSpec(this.mainViewPattern)
        }
    }
    public removeFieldInViewPattern (fid: string) {
        if (this.mainViewPattern) {
            const targetFieldIndex = this.mainViewPattern.fields.findIndex(f => f.fid === fid);
            if (targetFieldIndex > -1) {
                this.mainViewPattern.fields.splice(targetFieldIndex, 1)
                this.createMainViewSpec(this.mainViewPattern)
            }
        }
    }
    public async goToLastView () {
        const { pageIndex, insightSpaces } = this;
        this.emitViewChangeTransaction((pageIndex - 1 + insightSpaces.length) % insightSpaces.length)
    }
    public async goToNextView () {
        const { pageIndex, insightSpaces } = this;
        this.emitViewChangeTransaction((pageIndex + 1) % insightSpaces.length)
    }
    public emitViewChangeTransaction(index: number) {
        // pipleLineStore统一提供校验逻辑
        if (this.insightSpaces && this.insightSpaces.length > index) {
            const iSpace = this.insightSpaces[index];
            const patt = this.createMainViewPattern(iSpace);
            this.createMainViewSpec(patt);
            this.pageIndex = index;
            this.details = []
            this.showAsso = false;
            this.assoListT1 = [];
            this.assoListT2 = [];
            this.initVisualConfigResize();
        }
    }
    public refreshMainView () {
        this.emitViewChangeTransaction(this.pageIndex)
    }
    public setAggState (aggState: boolean) {
        this.visualConfig.defaultAggregated = aggState;
    }
    public setShowAsso (show: boolean) {
        this.showAsso = show;
    }
    public setShowContraints (show: boolean) {
        this.showConstraints = show;
    }
    public setShowSaveModal (show: boolean) {
        this.showSaveModal = show;
    }
    public async scanDetails (spaceIndex: number) {
        const result = await this.ltsPipeLineStore.scanDetails(spaceIndex);
        runInAction(() => {
            this.details = result;
        })
    }
    public async getStorageContent (): Promise<string> {
        // TODO: 序列化相关工程问题
        // 1. 下载与上传的处理逻辑尽量放在同一文件处理（待议）
        // 2. 要提供同一的parser处理，编解码逻辑可以集中管理并维护。目前这部分逻辑过分散乱。
        const pipeContent = await this.ltsPipeLineStore.downloadResults();
        const dataContent = JSON.stringify(this.ltsPipeLineStore.exportDataStore());
        return RathStorageDump({
            ...pipeContent,
            appStorage: dataContent
        })
    }
    public async downloadResults () {
        const content = await this.getStorageContent();
        const ele = document.createElement('a');
        ele.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
        ele.setAttribute('download', `Rath_Analysis_Notebook.${STORAGE_FILE_SUFFIX}`)
        ele.style.display = 'none'
        document.body.appendChild(ele)
        ele.click();

        document.body.removeChild(ele);
    }
    public async getAssociatedViews (taskMode = ITaskTestMode.local) {
        const space = this.insightSpaces[this.pageIndex];
        const asso = await this.ltsPipeLineStore.getAssociatedViews(space.dimensions, space.measures, taskMode);
        runInAction(() => {
            this.assoListT1 = asso.assSpacesT1;
            this.assoListT2 = asso.assSpacesT2;
            this.showAsso = true;
        })
    }
    public async getSubInsights (dimensions: string[], measures: string[]) {
        try {
            const data = await rathEngineService({
                task: 'subinsight',
                props: {
                    dimensions,
                    measures
                }
            })
            return data;
        } catch (error) {
            console.error(error)
            return []
        }
    }
}
