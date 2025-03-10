import { useMemo, useRef, CSSProperties } from "react";
import G6, { Graph, GraphData, GraphOptions } from "@antv/g6";
import type { ModifiableBgKnowledge } from "../config";
import type { IFieldMeta } from "../../../interfaces";
import type { CausalLink } from ".";


export const GRAPH_HEIGHT = 600;

export type GraphNodeAttributes<
    T extends 'circle' | 'rect' | 'ellipse' | 'diamond' | 'triangle' | 'star' | 'image' | 'modelRect' | 'donut' = 'circle'
> = Partial<{
    /** https://antv-g6.gitee.io/zh/docs/manual/middle/elements/nodes/defaultNode#%E5%86%85%E7%BD%AE%E8%8A%82%E7%82%B9%E7%B1%BB%E5%9E%8B%E8%AF%B4%E6%98%8E */
    type: T;
    style: Partial<{
        size: T extends 'circle' ? number : never;
        label: T extends 'circle' ? string : never;
        fill: string;
        stroke: string;
        lineWidth: number;
        lineDash: number[];
        shadowColor: string;
        shadowBlur: number;
        shadowOffsetX: number;
        shadowOffsetY: number;
        opacity: number;
        fillOpacity: number;
        cursor: CSSProperties['cursor'];
    }>;
}>;

const arrows = {
    undirected: {
        start: '',
        end: '',
    },
    directed: {
        start: '',
        end: 'M 12,0 L 28,8 L 28,-8 Z',
    },
    bidirected: {
        start: 'M 12,0 L 28,8 L 28,-8 Z',
        end: 'M 12,0 L 28,8 L 28,-8 Z',
    },
    'weak directed': {
        start: 'M 12,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0 Z',
        end: 'M 12,0 L 28,8 L 28,-8 Z',
    },
    'weak undirected': {
        start: 'M 12,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0 Z',
        end: 'M 12,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0 Z',
    },
} as const;

const bkArrows = {
    "must-link": {
        fill: '#0027b4',
        start: '',
        end: '',
    },
    "must-not-link": {
        fill: '#c50f1f',
        start: '',
        end: '',
    },
    "directed-must-link": {
        fill: '#0027b4',
        start: '',
        end: 'M 12,0 L 28,8 L 28,-8 Z',
    },
    "directed-must-not-link": {
        fill: '#c50f1f',
        start: '',
        end: 'M 12,0 L 28,8 L 28,-8 Z',
    },
} as const;

export const ForbiddenEdgeType = 'forbidden-edge';

G6.registerEdge(
    ForbiddenEdgeType,
    {
        afterDraw(cfg, group: any) {
            // 获取图形组中的第一个图形，在这里就是边的路径图形
            const shape = group.get('children')[0];
            // 获取路径图形的中点坐标
            const midPoint = shape.getPoint(0.5);
            group.addShape('path', {
                attrs: {
                    width: 10,
                    height: 10,
                    stroke: '#c50f1f',
                    lineWidth: 2,
                    path: [
                        ['M', midPoint.x + 8, midPoint.y + 8],
                        ['L', midPoint.x - 8, midPoint.y - 8],
                        ['M', midPoint.x - 8, midPoint.y + 8],
                        ['L', midPoint.x + 8, midPoint.y - 8],
                    ],
                },
                name: 'forbidden-mark',
            });
        },
        update: undefined,
    },
    'line',
);

export const useRenderData = (
    data: { nodes: { id: number }[]; links: { source: number; target: number; type: CausalLink['type'] }[] },
    mode: "explore" | "edit",
    preconditions: readonly ModifiableBgKnowledge[],
    fields: readonly Readonly<IFieldMeta>[],
    renderNode?: (node: Readonly<IFieldMeta>) => GraphNodeAttributes | undefined,
) => {
    return useMemo<GraphData>(() => ({
        nodes: data.nodes.map((node, i) => {
            return {
                id: `${node.id}`,
                description: fields[i].name ?? fields[i].fid,
                ...renderNode?.(fields[i]),
            };
        }),
        edges: mode === 'explore' ? data.links.map((link, i) => {
            return {
                id: `link_${i}`,
                source: `${link.source}`,
                target: `${link.target}`,
                style: {
                    startArrow: {
                        fill: '#F6BD16',
                        path: arrows[link.type].start,
                    },
                    endArrow: {
                        fill: '#F6BD16',
                        path: arrows[link.type].end,
                    },
                },
            };
        }) : preconditions.map((bk, i) => ({
            id: `bk_${i}`,
            source: `${fields.findIndex(f => f.fid === bk.src)}`,
            target: `${fields.findIndex(f => f.fid === bk.tar)}`,
            style: {
                lineWidth: 2,
                lineAppendWidth: 5,
                stroke: bkArrows[bk.type].fill,
                startArrow: {
                    fill: bkArrows[bk.type].fill,
                    stroke: bkArrows[bk.type].fill,
                    path: bkArrows[bk.type].start,
                },
                endArrow: {
                    fill: bkArrows[bk.type].fill,
                    stroke: bkArrows[bk.type].fill,
                    path: bkArrows[bk.type].end,
                },
            },
            edgeStateStyles: {
                active: {
                    lineWidth: 2,
                },
            },
            type: bk.type === 'must-not-link' || bk.type === 'directed-must-not-link' ? ForbiddenEdgeType : undefined,
        })),
    }), [data, mode, preconditions, fields, renderNode]);
};

export const useGraphOptions = (
    width: number,
    fields: readonly Readonly<IFieldMeta>[],
    handleLink: (srcFid: string, tarFid: string) => void,
    graphRef: { current: Graph | undefined },
) => {
    const widthRef = useRef(width);
    widthRef.current = width;
    const fieldsRef = useRef(fields);
    fieldsRef.current = fields;
    const handleLinkRef = useRef(handleLink);
    handleLinkRef.current = handleLink;

    return useMemo<Omit<GraphOptions, 'container'>>(() => {
        let createEdgeFrom = -1;
        const exploreMode = ['drag-canvas', 'drag-node'];
        const editMode = ['drag-canvas', {
            type: 'create-edge',
            trigger: 'drag',
            shouldBegin(e: any) {
                const source = e.item?._cfg?.id;
                if (source) {
                    createEdgeFrom = parseInt(source, 10);
                }
                return true;
            },
            shouldEnd(e: any) {
                if (createEdgeFrom === -1) {
                    return false;
                }
                const target = e.item?._cfg?.id;
                if (target) {
                    const origin = fieldsRef.current[createEdgeFrom];
                    const destination = fieldsRef.current[parseInt(target, 10)];
                    if (origin.fid !== destination.fid) {
                        handleLinkRef.current(origin.fid, destination.fid);
                    }
                }
                createEdgeFrom = -1;
                return false;
            },
        }];
        const cfg: Omit<GraphOptions, 'container'> = {
            width: widthRef.current,
            height: GRAPH_HEIGHT,
            linkCenter: true,
            modes: {
                explore: exploreMode,
                explore_zoom: [...exploreMode, 'zoom-canvas'],
                edit: editMode,
                edit_zoom: [...exploreMode, 'zoom-canvas'],
            },
            animate: true,
            layout: {
                type: 'fruchterman',
                // https://antv-g6.gitee.io/zh/docs/api/graphLayout/fruchterman#layoutcfggpuenabled
                // 启用 GPU 加速会导致数据更新时视图变化很大
                gpuEnabled: false,
                speed: 1,
                // for rendering after each iteration
                tick: () => {
                    graphRef.current?.refreshPositions();
                },
            },
            defaultNode: {
                size: 24,
                style: {
                    lineWidth: 2,
                },
            },
            nodeStateStyles: {
                focused: {
                    lineWidth: 3,
                    opacity: 1,
                },
                highlighted: {
                    lineWidth: 2.5,
                    opacity: 1,
                },
                faded: {
                    opacity: 0.4,
                },
            },
            defaultEdge: {
                size: 1,
                color: '#F6BD16',
                opacity: 0.9,
            },
            edgeStateStyles: {
                highlighted: {
                    lineWidth: 1.5,
                    opacity: 1,
                },
                faded: {
                    opacity: 0.2,
                },
            },
        };
        return cfg;
    }, [graphRef]);
};
