import { makeAutoObservable, runInAction, toJS } from "mobx";
import produce from "immer";
import type { IFieldMeta, IFilter, IVegaSubset } from "../interfaces";


export enum DashboardCardAppearance {
    /** 隐性底板（无样式 div） */
    Transparent = 'transparent',
    /** 阴影卡片 */
    Dropping = 'dropping',
    /** 扁平化底板。（只有border） */
    Outline = 'outline',
    /** 新拟态 @see https://neumorphism.io/ */
    Neumorphism = 'neumorphism',
}

export enum DashboardCardInsetLayout {
    /** 按卡片宽高比自动适配 */
    Auto,
    /** 横向布局 */
    Row,
    /** 纵向布局 */
    Column,
}

export type DashboardCard = {
    layout: {
        x: number;
        y: number;
        w: number;
        h: number;
    };
    content: Partial<{
        title: string;
        text: string;
        chart: {
            subset: IVegaSubset;
            /** 图表自身数据的筛选器 */
            filters: IFilter[];
            /** 图表对其他所有图表数据的筛选器 */
            selectors: IFilter[];
        };
    }>;
    config: {
        /**
         * Appearance of cards.
         * @default DashboardCardAppearance.Transparent
         */
        appearance: DashboardCardAppearance;
        align: DashboardCardInsetLayout;
    };
};

export interface DashboardCardState extends DashboardCard {
    content: Partial<Required<DashboardCard['content']> & {
        chart: DashboardCard['content']['chart'] & {
            /* 这俩不要持久化 */
            /** 图表对全局所有图表高亮数据的筛选器 */
            highlighter: IFilter[];
            size: { w: number; h: number };
        };
    }>;
}

export interface DashboardDocument {
    version: number;
    info: {
        name: string;
        description: string;
        createTime: number;
        lastModifyTime: number;
    };
    data: {
        /** Name of the data source, used to display and mention the data source */
        source: string;
        /** Filters working globally  */
        filters: {
            field: IFieldMeta;
            filter: IFilter;
        }[];
    };
    /** All cards defined in the dashboard */
    cards: DashboardCardState[];
    config: {
        size: { w: number; h: number };
        filters: IFilter[];
    };
}

export interface DashboardDocumentOperators {
    // document level
    copy: () => void;
    remove: () => void;
    download: () => void;
    setName: (name: string) => void;
    setDesc: (desc: string) => void;
    // data level
    addCard: (layout: DashboardCard['layout']) => number;
    moveCard: (index: number, x: number, y: number) => void;
    removeCard: (index: number) => void;
    resizeCard: (index: number, w: number, h: number) => void;
    addDataFilter: (filter: IFilter) => void;
    removeDataFilter: (index: number) => void;
    fireUpdate: () => void;
}

export interface DashboardDocumentWithOperators {
    data: DashboardDocument;
    operators: Readonly<DashboardDocumentOperators>;
}

export default class DashboardStore {

    public static readonly rendererVersion = 1;

    protected static writeDocumentObjectBlob(data: DashboardDocument): Blob {
        // TODO: optimize
        const part = JSON.stringify(data);
        const file = new Blob([ part ], { type: 'text/plain' });
        return file;
    }

    protected static async readObjectBlob(blob: Blob): Promise<DashboardDocument> {
        const text = await blob.text();
        // TODO: optimize
        const data = JSON.parse(text) as DashboardDocument;
        return data;
    }

    public name: string;
    public description: string;
    public pages: DashboardDocument[];

    constructor() {
        makeAutoObservable(this);
        this.name = 'My Dashboard List';
        this.description = '';
        this.pages = [];
        this.newPage();
    }

    public newPage() {
        const now = Date.now();
        this.pages.push({
            version: DashboardStore.rendererVersion,
            info: {
                name: 'New Dashboard',
                description: '',
                createTime: now,
                lastModifyTime: now,
            },
            data: {
                source: 'context dataset', // TODO: get name from data source
                filters: [],
            },
            cards: [],
            config: {
                size: {
                    w: 256,
                    h: 256,
                },
                filters: [],
            },
        });
    }

    protected copyPage(index: number) {
        const page = this.pages[index];
        this.pages.push(produce(toJS(page), draft => {
            const now = Date.now();
            draft.info.createTime = now;
            draft.info.lastModifyTime = now;
            draft.info.name = `${draft.info.name} (copy)`;
        }));
    }
    protected removePage(index: number) {
        this.pages.splice(index, 1);
    }
    protected downloadPage(index: number) {
        const page = this.pages[index];
        const data = this.createDocumentObjectBlob(index);
        const a = document.createElement('a');
        const url = URL.createObjectURL(data);
        a.href = url;
        a.download = `${page.info.name}.rath-dashboard`;
        a.click();
        requestAnimationFrame(() => {
            window.URL.revokeObjectURL(url);  
        });
    }
    protected setPageName(index: number, name: string) {
        this.pages[index].info.name = name;
    }
    protected setPageDesc(index: number, desc: string) {
        this.pages[index].info.description = desc;
    }
    protected addPageCard(index: number, layout: DashboardCard['layout']) {
        return this.pages[index].cards.push({
            layout,
            content: {},
            config: {
                appearance: DashboardCardAppearance.Transparent,
                align: DashboardCardInsetLayout.Column,
            },
        });
    }
    protected movePageCard(pageIndex: number, index: number, x: number, y: number) {
        this.pages[pageIndex].cards[index].layout.x = x;
        this.pages[pageIndex].cards[index].layout.y = y;
    }
    protected resizePageCard(pageIndex: number, index: number, w: number, h: number) {
        this.pages[pageIndex].cards[index].layout.w = w;
        this.pages[pageIndex].cards[index].layout.h = h;
    }
    protected removePageCard(pageIndex: number, index: number) {
        this.pages[pageIndex].cards.splice(index, 1);
    }
    protected addPageDataFilter(pageIndex: number, filter: IFilter) {
        this.pages[pageIndex].config.filters.push(filter);
    }
    protected removeDataFilter(pageIndex: number, index: number) {
        this.pages[pageIndex].config.filters.splice(index, 1);
    }

    public setName(name: string) {
        this.name = name;
    }
    public setDesc(desc: string) {
        this.description = desc;
    }

    public fromPage(index: number): DashboardDocumentWithOperators {
        const page = this.pages[index];

        return {
            data: page,
            operators: {
                copy: this.copyPage.bind(this, index),
                remove: this.removePage.bind(this, index),
                download: this.downloadPage.bind(this, index),
                setName: this.setPageName.bind(this, index),
                setDesc: this.setPageDesc.bind(this, index),
                addCard: this.addPageCard.bind(this, index),
                moveCard: this.movePageCard.bind(this, index),
                resizeCard: this.resizePageCard.bind(this, index),
                removeCard: this.removePageCard.bind(this, index),
                addDataFilter: this.addPageDataFilter.bind(this, index),
                removeDataFilter: this.removeDataFilter.bind(this, index),
                fireUpdate: () => this.pages[index].info.lastModifyTime = Date.now(),
            },
        };
    }

    protected createDocumentObjectBlob(index: number): Blob {
        const page = this.pages[index];
        const storableState = DashboardStore.writeDocumentObjectBlob(page);
        return storableState;
    }

    public async loadDocumentObjectBlob(data: Blob): Promise<void> {
        const doc = await DashboardStore.readObjectBlob(data);
        runInAction(() => {
            this.pages.push(doc);
        });
    }

    /**
     * 涉及到适合使用 mobx runInAction 处理的场景，改写为这个方法，以方便在这个 store 中进行追踪
     * @param updater change any state in store as an action
     */
    public runInAction(updater: () => void): void {
        updater();
    }

}
