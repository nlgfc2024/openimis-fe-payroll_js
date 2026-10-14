import React, { useEffect, useMemo, useState } from 'react';
import {
  Autocomplete, decodeId, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

const PayrollProjectPicker = ({
  benefitPlanId, microCatchment, onChange, onProjectsLoaded, readOnly, value,
}) => {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations('projectSocialProtection', modulesManager);
  const [search, setSearch] = useState('');
  const microCatchmentId = microCatchment?.id || null;
  const { data, error, isLoading } = useGraphqlQuery(
    `
      query PayrollProjectPicker($search: String, $benefitPlanId: ID, $microCatchmentId: ID) {
        project(
          name_Icontains: $search,
          benefitPlan_Id: $benefitPlanId,
          microCatchment_Id: $microCatchmentId,
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
  const projects = useMemo(() => (data?.project?.edges || []).map(({ node }) => ({
    ...node,
    id: decodeId(node.id),
  })), [data]);
  const projectIds = projects.map((project) => project.id).join(',');

  useEffect(() => {
    if (microCatchmentId && !isLoading) onProjectsLoaded?.(projects);
  }, [microCatchmentId, isLoading, onProjectsLoaded, projectIds]);

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
