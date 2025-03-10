import React, { useCallback } from 'react';
import intl from 'react-intl-universal';
import { observer } from 'mobx-react-lite';
import {  CommandBar, ICommandBarItemProps } from '@fluentui/react';
import { toJS } from 'mobx';
import { useGlobalStore } from '../../../store';

interface OperationBarProps {}
const OperationBar: React.FC<OperationBarProps> = props => {
    const { megaAutoStore, commonStore, collectionStore, painterStore } = useGlobalStore();
    const { taskMode } = commonStore;
    const { mainViewSpec, mainViewPattern } = megaAutoStore;

    const customizeAnalysis = useCallback(() => {
        if (mainViewSpec) {
            commonStore.visualAnalysisInGraphicWalker(mainViewSpec)
        }
    }, [mainViewSpec, commonStore])

    const analysisInPainter = useCallback(() => {
        if (mainViewSpec && mainViewPattern) {
            painterStore.analysisInPainter(mainViewSpec, mainViewPattern)
        }
    }, [mainViewSpec, mainViewPattern, painterStore])

    const viewExists = !(mainViewPattern === null || mainViewSpec === null);
    let starIconName = 'FavoriteStar';
    if (viewExists) {
        const viewFields = toJS(mainViewPattern.fields);
        const viewSpec = toJS(mainViewSpec);
        if (collectionStore.collectionContains(viewFields, viewSpec)) {
            starIconName = 'FavoriteStarFill'
        }
    }

    const commandProps: ICommandBarItemProps[] = [
        {
            key: 'editing',
            text: intl.get('megaAuto.commandBar.editing'),
            iconProps: { iconName: 'BarChartVerticalEdit' },
            onClick: customizeAnalysis
        },
        {
            key: 'painting',
            text: intl.get('megaAuto.commandBar.painting'),
            iconProps: { iconName: 'EditCreate' },
            onClick: analysisInPainter
        },
        {
            key: 'associate',
            text: intl.get('megaAuto.commandBar.associate'),
            iconProps: { iconName: 'Lightbulb' },
            onClick: () => {
                megaAutoStore.getAssociatedViews(taskMode);
            }
        },
        {
            key: 'star',
            text: intl.get('common.star'),
            iconProps: { iconName: starIconName },
            onClick: () => {
                if (mainViewPattern && mainViewSpec) {
                    collectionStore.toggleCollectState(toJS(mainViewPattern.fields), toJS(mainViewSpec))
                }
            }
        },
        {
            key: 'constraints',
            text: intl.get('megaAuto.commandBar.constraints'),
            iconProps: { iconName: 'MultiSelect' },
            onClick: () => {
                megaAutoStore.setShowContraints(true);
            },
            disabled: true
        }
    ]

    return <div style={{ position: 'relative', zIndex: 99}}>
        <CommandBar items={commandProps} />
    </div>
}

export default observer(OperationBar);
