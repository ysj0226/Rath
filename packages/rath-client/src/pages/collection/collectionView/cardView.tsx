import { applyFilters } from '@kanaries/loa';
import React, { useState } from 'react';
import styled from 'styled-components';
import { Divider, Pagination } from '@material-ui/core';
import ReactVega from '../../../components/react-vega';
import ViewInfo from '../../../components/viewInfo/textInfo';
import { IFieldMeta, IInsightVizView, IRow } from '../../../interfaces';
import VisErrorBoundary from '../../../components/visErrorBoundary';
import { changeVisSize, VIEW_NUM_IN_PAGE } from '../utils';

const CollectContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    .seg-header {
        font-size: 3em;
        font-weight: 500;
    }
    .chart-container {
        border: 1px solid rgb(218, 220, 224);
        border-radius: 1em;
        padding: 1em;
        margin: 0.5em;
        cursor: pointer;
    }
    .collect-title {
        width: 100%;
        font-size: 1.125rem;
        display: flex;
        justify-content: center;
        font-weight: bold;
        margin-bottom: 2px;
    }
    .c-desc {
        > div:first-child {
            /* w-full text-gray-700 text-sm */
            width: 100%;
            color: rgba(55, 65, 81);
            font-size: 0.875rem;
            line-height: 1.25rem;
        }
    }
`;

interface CardViewProps {
    data: IRow[];
    metas: IFieldMeta[];
    views: IInsightVizView[];
    onConfig: (data: IInsightVizView) => void;
}
const CardView: React.FC<CardViewProps> = (props) => {
    const { data, views, metas, onConfig } = props;
    const [pageIndex, setPageIndex] = useState<number>(0);
    return (
        <div>
            <Pagination
                style={{ marginTop: '1em', marginLeft: '1em' }}
                variant="outlined"
                shape="rounded"
                count={Math.ceil(views.length / VIEW_NUM_IN_PAGE)}
                page={pageIndex + 1}
                onChange={(e, v) => {
                    setPageIndex(v - 1);
                }}
            />
            <Divider style={{ marginBottom: '1em', marginTop: '1em' }} />
            <CollectContainer>
                {views.slice(pageIndex * VIEW_NUM_IN_PAGE, (pageIndex + 1) * VIEW_NUM_IN_PAGE).map((item, i) => (
                    <div
                        className="chart-container"
                        key={item.viewId}
                        onClick={() => {
                            onConfig(item);
                        }}
                    >
                        <div className="collent-title">{item.title}</div>
                        <div className="c-vis">
                            <VisErrorBoundary>
                                <ReactVega
                                    dataSource={applyFilters(data, item.filters)}
                                    spec={changeVisSize(item.spec, 200, 180)}
                                    actions={false}
                                />
                            </VisErrorBoundary>
                        </div>
                        <div className="c-desc">
                            <div>{item.desc}</div>
                            <ViewInfo metas={metas} fields={item.fields} filters={item.filters} />
                        </div>
                    </div>
                ))}
            </CollectContainer>
        </div>
    );
};

export default CardView;
