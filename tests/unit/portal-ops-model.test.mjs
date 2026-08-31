import assert from "node:assert/strict";
import { isSafeLogoPreview, validateClubsCommand, validateHourlyDraft } from "../../src/pages/portal-ops/portal-ops-model.js";

const valid={occurrence_id:"hourly_2099-07-25_2100",race_start_local:"2099-07-25T20:00",server_open_local:"2099-07-25T19:00",track_code:"spa",practice_minutes:60,qualifying_minutes:20,race_minutes:60,pre_race_wait_seconds:80,session_overtime_seconds:120,server_window_minutes:144,hour_of_day:18,ambient_temp_c:23,cloud_level:.2,rain_level:.05,weather_randomness:1};
assert.equal(validateHourlyDraft(valid,["spa"]).ok,true);
assert.equal(validateHourlyDraft({...valid,server_window_minutes:143},["spa"]).code,"window_too_short");
assert.equal(validateHourlyDraft({...valid,server_open_local:"2099-07-25T20:00"},["spa"]).code,"invalid_open_time");

const club={entity_type:"club",public_id:"clb_fixture0001",row_version:3,pending_revision:true,pending_logo:false};
const approval=validateClubsCommand(club,"portal.entity.revision_decide:approved","","");
assert.equal(approval.ok,true);
assert.equal(approval.expectedEntityVersion,3);
assert.equal(approval.payload.decision,"approved");
assert.equal(validateClubsCommand(club,"portal.entity.logo_decide:approved","","").code,"logo_revision_not_pending");
assert.equal(validateClubsCommand(club,"portal.membership.admin_add","bad","Roster fix").code,"invalid_member");
assert.equal(validateClubsCommand(club,"portal.membership.admin_remove","drv_member","x").code,"reason_required");
assert.equal(isSafeLogoPreview("data:image/png;base64,YQ==","image/png"),true);
assert.equal(isSafeLogoPreview("https://evil.test/logo.png","image/png"),false);
assert.equal(isSafeLogoPreview("data:image/jpeg;base64,YQ==","image/png"),false);
