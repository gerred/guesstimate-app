import React, {Component} from 'react'

import Icon from 'react-fa'

import {spaceUrlById} from 'gEngine/space'
import {navigateFn} from 'gModules/navigation/actions'
import {isExportedFromSpace, length, mean, adjustedConfidenceInterval} from 'gEngine/facts'
import {DistributionSummary} from 'gComponents/distributions/summary/index'
import Histogram from 'gComponents/simulations/histogram/index'

import {allPropsPresent} from 'gEngine/utils'

export const FactItem = ({fact, onEdit, isExportedFromSelectedSpace, size}) => {
  const exported_from_url = spaceUrlById(_.get(fact, 'exported_from_id'), {factsShown: 'true'})
  return (
    <div className={`Fact--outer ${size}`}>
      <div className='Fact'>
        <div className='section-simulation simulation-sample'>
          {allPropsPresent(fact, 'simulation.sample.values.length', 'simulation.stats.mean') &&
            <div>
              <div className='simulation-summary'>
                <DistributionSummary
                  length={length(fact)}
                  mean={mean(fact)}
                  adjustedConfidenceInterval={adjustedConfidenceInterval(fact)}
                />
              </div>
              <div className='histogram'>
                <Histogram
                  height={15}
                  simulation={fact.simulation}
                  cutOffRatio={0.995}
                />
              </div>
            </div>
          }
        </div>
        <div className='section-name'>
          <span className='fact-name'>{fact.name}</span>
          {(size !== 'SMALL') &&
            <div className='variable-name variable-token'>
              <span className='prefix'>#</span>
              <div className='name'>{fact.variable_name}</div>
            </div>
          }
        </div>

      {(size !== 'SMALL') &&
        <div className='section-help'>
          <span className='ui button small options' onClick={onEdit}>Edit</span>
        </div>
      }

      {!!isExportedFromSpace(fact) && (size !== 'SMALL') &&
        <div className='section-exported' onClick={!isExportedFromSelectedSpace && navigateFn(exported_from_url)}>
          {!isExportedFromSelectedSpace && <Icon name='share'/>}
        </div>
        }
      </div>
    </div>
  )
}
