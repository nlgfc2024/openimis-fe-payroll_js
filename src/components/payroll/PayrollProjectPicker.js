import React, { useState } from 'react';
import {
  Autocomplete, decodeId, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

// The deployment's project type, from the exposed project_social_protection backend
// configuration (as the project module reads it). Payroll pays a work project only
// once it is COMPLETED, but a training (Jobs Now, UMEP) whatever its status: the
// calculation rule decides which attendance counts.
const isTrainingDeployment = (modulesManager) => modulesManager.getConf(
  'project_social_protection', 'project_type', 'WORK',
) === 'TRAINING';

const PayrollProjectPicker = ({
  benefitPlanId, microCatchment, onChange, readOnly, value,
}) => {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('projectSocialProtection', modulesManager);
  const [search, setSearch] = useState('');
  const microCatchmentId = microCatchment?.id || null;
  const statusFilter = isTrainingDeployment(modulesManager) ? '' : 'status: COMPLETED,';
  const { data, error, isLoading } = useGraphqlQuery(
    `
      query PayrollProjectPicker($search: String, $benefitPlanId: ID, $microCatchmentId: ID) {
        project(
          name_Icontains: $search,
          benefitPlan_Id: $benefitPlanId,
          microCatchment_Id: $microCatchmentId,
          ${statusFilter}
          isDeleted: false,
          orderBy: "name"
        ) {
          edges { node { id name } }
        }
      }
    `,
    { search, benefitPlanId, microCatchmentId },
    { skip: !benefitPlanId },
  );
  const projects = (data?.project?.edges || []).map(({ node }) => ({
    ...node,
    id: decodeId(node.id),
  }));

  return (
    <Autocomplete
      withLabel
      withPlaceholder
      multiple
      label={formatMessage('project.picker.label')}
      placeholder={formatMessage('project.picker.placeholder')}
      readOnly={readOnly}
      error={error}
      isLoading={isLoading}
      options={projects}
      value={value}
      getOptionLabel={(project) => project?.name || ''}
      onChange={onChange}
      onInputChange={setSearch}
    />
  );
};

export default PayrollProjectPicker;
