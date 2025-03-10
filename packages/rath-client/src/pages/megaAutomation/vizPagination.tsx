import { Icon, SearchBox } from '@fluentui/react';
import { IPattern } from '@kanaries/loa';
import usePagination from '@material-ui/core/usePagination/usePagination';
import produce from 'immer';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import ReactVega from '../../components/react-vega';
import { IFieldMeta, IVegaSubset } from '../../interfaces';
import { distVis } from '../../queries/distVis';
import { labDistVis } from '../../queries/labdistVis';
import { useGlobalStore } from '../../store';
import VisErrorBoundary from '../../components/visErrorBoundary';
import { changeVisSize } from '../collection/utils';
import { ISearchInfoBase, searchFilterView } from '../../utils';

const VizCard = styled.div<{ selected?: boolean }>`
    /* width: 140px; */
    overflow: hidden;
    height: 140px;
    padding: 4px;
    margin: 12px 4px 4px 4px;
    border: 1px solid ${(props) => (props.selected ? '#faad14' : 'rgba(0, 0, 0, 0.23)')};
    color: #434343;
    border-radius: 4px;
    display: flex;
    cursor: pointer;
    justify-content: center; /* 水平居中 */
    align-items: center; /* 垂直居中 */
`;

const VizCardContainer = styled.div`
    display: flex;
    overflow-x: auto;
`;

const StyledChart = styled(ReactVega)`
    cursor: pointer;
`;

function extractVizGridOnly(spec: IVegaSubset): IVegaSubset {
    const nextSpec = produce(spec, (draft) => {
        draft.view = {
            stroke: null,
            fill: null,
        };
        for (let ch in draft.encoding) {
            if (draft.encoding[ch as keyof IVegaSubset['encoding']]) {
                // @ts-ignore
                draft.encoding[ch as keyof IVegaSubset['encoding']]!.title = null;
                // @ts-ignore
                draft.encoding[ch as keyof IVegaSubset['encoding']]!.axis = {
                    labelLimit: 32,
                    labelOverlap: 'parity',
                    ticks: false,
                };
                // @ts-ignore
                draft.encoding[ch].legend = null;
            }
        }
    });
    return nextSpec;
}

const VizPagination: React.FC = (props) => {
    const { megaAutoStore } = useGlobalStore();
    const { insightSpaces, fieldMetas, visualConfig, vizMode, pageIndex, samplingDataSource } = megaAutoStore;
    const [searchContent, setSearchContent] = useState<string>('');
    const updatePage = useCallback(
        (e: any, v: number) => {
            megaAutoStore.emitViewChangeTransaction((v - 1) % insightSpaces.length);
        },
        [megaAutoStore, insightSpaces.length]
    );

    const insightViews = useMemo<ISearchInfoBase[]>(() => {
        return insightSpaces.map((space) => {
            const fields = space.dimensions
                .concat(space.measures)
                .map((f) => fieldMetas.find((fm) => fm.fid === f))
                .filter((f) => Boolean(f)) as IFieldMeta[];
            const patt: IPattern = { fields, imp: space.score || 0 };
            const spec =
                vizMode === 'strict'
                    ? labDistVis({
                          pattern: patt,
                          width: 200,
                          height: 160,
                          dataSource: samplingDataSource,
                      })
                    : distVis({
                          pattern: patt,
                          width: 200,
                          height: 160,
                          stepSize: 32,
                      });
            const viewSpec = extractVizGridOnly(changeVisSize(spec, 100, 100));
            return {
                fields,
                filters: [],
                spec: viewSpec,
            };
        });
    }, [fieldMetas, vizMode, insightSpaces, samplingDataSource]);

    const searchedInsightViews = useMemo(() => {
        return searchFilterView(searchContent, insightViews);
    }, [searchContent, insightViews])

    const { items } = usePagination({
        count: searchedInsightViews.length,
        showFirstButton: false,
        showLastButton: false,
        siblingCount: 1,
        page: pageIndex + 1,
        onChange: updatePage,
    });
    return (
        <div>
            <SearchBox
                onSearch={setSearchContent}
                placeholder="search views"
                iconProps={{ iconName: 'Search' }}
            />
            <VizCardContainer>
                {searchedInsightViews.length > 0 &&
                    items.map(({ page, type, selected, ...item }, index) => {
                        let children = null;
                        if (type === 'start-ellipsis' || type === 'end-ellipsis') {
                            children = '…';
                        } else if (type === 'page') {
                            if (typeof page === 'number' && searchedInsightViews[page - 1]) {
                                const view = searchedInsightViews[page - 1];
                                children = (
                                    <VisErrorBoundary>
                                        <StyledChart
                                            dataSource={samplingDataSource}
                                            spec={view.spec}
                                            actions={visualConfig.debug}
                                        />
                                    </VisErrorBoundary>
                                );
                            } else {
                                children = (
                                    <button
                                        type="button"
                                        style={{
                                            fontWeight: selected ? 'bold' : undefined,
                                        }}
                                        {...item}
                                    >
                                        {page}
                                    </button>
                                );
                            }
                        } else {
                            if (type === 'next')
                                children = (
                                    <Icon style={{ fontSize: '2em', fontWeight: 600 }} iconName="ChevronRight" />
                                );
                            if (type === 'previous')
                                children = <Icon style={{ fontSize: '2em', fontWeight: 600 }} iconName="ChevronLeft" />;
                        }
                        return (
                            <VizCard {...item} selected={selected} key={index}>
                                {children}
                            </VizCard>
                        );
                    })}
            </VizCardContainer>
        </div>
    );
};

export default observer(VizPagination);
