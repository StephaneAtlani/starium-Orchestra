import { AccessControlService } from '../access-control/access-control.service';
import { PROJECT_REQUEST_RESOURCE_TYPE } from './project-request.constants';

export async function canReadProjectRequest(
  accessControl: AccessControlService,
  params: {
    clientId: string;
    userId: string;
    resourceId: string;
    sharingFloorAllows?: boolean;
  },
): Promise<boolean> {
  return accessControl.canReadResource({
    clientId: params.clientId,
    userId: params.userId,
    resourceTypeNormalized: PROJECT_REQUEST_RESOURCE_TYPE,
    resourceId: params.resourceId,
    sharingFloorAllows: params.sharingFloorAllows,
  });
}

export async function canWriteProjectRequest(
  accessControl: AccessControlService,
  params: {
    clientId: string;
    userId: string;
    resourceId: string;
    sharingFloorAllows?: boolean;
  },
): Promise<boolean> {
  return accessControl.canWriteResource({
    clientId: params.clientId,
    userId: params.userId,
    resourceTypeNormalized: PROJECT_REQUEST_RESOURCE_TYPE,
    resourceId: params.resourceId,
    sharingFloorAllows: params.sharingFloorAllows,
  });
}

export async function filterReadableProjectRequestIds(
  accessControl: AccessControlService,
  params: {
    clientId: string;
    userId: string;
    resourceIds: string[];
    sharingFloorAllows?: boolean;
  },
): Promise<string[]> {
  return accessControl.filterReadableResourceIds({
    clientId: params.clientId,
    userId: params.userId,
    resourceTypeNormalized: PROJECT_REQUEST_RESOURCE_TYPE,
    resourceIds: params.resourceIds,
    operation: 'read',
    sharingFloorAllows: params.sharingFloorAllows,
  });
}
