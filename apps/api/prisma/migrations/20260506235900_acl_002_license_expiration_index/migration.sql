-- RFC-ACL-002 - Index for write-license expiration checks
CREATE INDEX "ClientUser_clientId_licenseEndsAt_idx"
ON "ClientUser"("clientId", "licenseEndsAt");
