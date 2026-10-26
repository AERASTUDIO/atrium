# Takmarkar sjálfvirkan póst Atrium (Application Mail.Send / Mail.Read) við pósthólf í einum hópi.
# Keyrt EINU SINNI fyrir hvert Microsoft 365 (tenant) sem Atrium er sett upp í.
#
# Áður:
#   1. Exchange admin center › Recipients › Groups › Mail-enabled security › Add a group
#      Nafn „Atrium – póstaðgangur“, netfang t.d. atrium-postur@<lén>, meðlimir: sameiginlega pósthólfið
#      (t.d. aera@) og þeir sem nota „Mitt pósthólf“ í Atrium. Haka við „Require owner approval to join“.
#   2. Windows PowerShell (ekki Cloud Shell – Security defaults loka á innskráningu með kóða).
#
# Notkun:
#   .\postadgangur.ps1 -AppId <Application (client) ID> -Hopur atrium-postur@<lén> -Profa aera@<lén>
# Engin leyndarmál eru í þessari skrá.
param(
  [Parameter(Mandatory = $true)][string]$AppId,
  [Parameter(Mandatory = $true)][string]$Hopur,
  [Parameter(Mandatory = $true)][string]$Profa,
  [string]$Admin
)
$ErrorActionPreference = "Stop"

if (-not (Get-Module -ListAvailable ExchangeOnlineManagement)) {
  Install-Module ExchangeOnlineManagement -Scope CurrentUser -Force -AllowClobber
}
if ((Get-ExecutionPolicy -Scope CurrentUser) -in @("Restricted", "Undefined")) {
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned -Force
}
Import-Module ExchangeOnlineManagement
if ($Admin) { Connect-ExchangeOnline -UserPrincipalName $Admin -ShowBanner:$false } else { Connect-ExchangeOnline -ShowBanner:$false }

try {
  $til = Get-ApplicationAccessPolicy | Where-Object { $_.AppId -eq $AppId }
  if ($til) {
    Write-Host "Regla er þegar til fyrir forritið:" -ForegroundColor Yellow
    $til | Format-Table ScopeName, AccessRight, Description
  } else {
    New-ApplicationAccessPolicy -AppId $AppId -PolicyScopeGroupId $Hopur -AccessRight RestrictAccess `
      -Description "Atrium má aðeins nota pósthólf í hópnum $Hopur" | Format-Table ScopeName, AccessRight
  }
  Set-DistributionGroup $Hopur -HiddenFromAddressListsEnabled $true
  Write-Host "Hópurinn er falinn í Outlook." -ForegroundColor Green

  $r = Test-ApplicationAccessPolicy -Identity $Profa -AppId $AppId
  Write-Host ("Prófun á {0}: {1}" -f $Profa, $r.AccessCheckResult) -ForegroundColor ($(if ($r.AccessCheckResult -eq "Granted") { "Green" } else { "Red" }))
  Write-Host "Reglan getur verið allt að 30 mínútur að taka gildi alls staðar."
} finally {
  Disconnect-ExchangeOnline -Confirm:$false
}
