import React, { useState } from 'react';
import {
  Autocomplete, decodeId, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

const PayrollProjectPicker = ({
  benefitPlanId, microCatchment, onChange, readOnly, value,
}) => {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('projectSocialProtection', modulesManager);
  const [search, setSearch] = useState('');
  const microCatchmentId = microCatchment?.id ? decodeId(microCatchment.id) : null;
  const { data, error, isLoading } = useGraphqlQuery(
    `
      query PayrollProjectPicker($search: String, $benefitPlanId: ID, $microCatchmentId: ID) {
        project(
          name_Icontains: $search,
          benefitPlan_Id: $benefitPlanId,
          microCatchment_Id: $microCatchmentId,
          status: COMPLETED,
          isDeleted: false,
          orderBy: "name"
        ) {
          edges { node { id name } }
        }
      }
    `,
    { search, benefitPlanId, microCatchmentId },
    { skip: !benefitPlanId || !microCatchmentId },
  );
  const projects = (data?.project?.edges || []).map(({ node }) => ({
    ...node,
    id: decodeId(node.id),
  }));

  return (
    <Autocomplete
      required
      withLabel
      withPlaceholder
      multiple
      label={formatMessage('project.picker.label')}
      placeholder={formatMessage('project.picker.placeholder')}
      readOnly={readOnly || !microCatchmentId}
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
