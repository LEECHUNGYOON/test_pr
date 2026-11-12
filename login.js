

function a(){
    
}

/************************************************************************
 * @function - PowerShell로 SP 파일 다운로드
 ************************************************************************/
function _getSuppPackDataFromPowerShell(oPARAM) {

    return new Promise(function(resolve){

        // 설치 파일 정보
        let oFileInfo = oPARAM.FILE_INFO;
      
        oFileInfo.TRANSFERRED = 0;

        var oRES = JSON.parse(JSON.stringify(TY_RES)); 

        oRES.PRCCD = PRC.DOWN_LOADING; // 다운로드 중
        oRES.PARAM = {
            FILE_INFO: oFileInfo
        };

        self.postMessage(oRES);

        let aParams = [
            "-ExecutionPolicy", "Bypass",
            "-File", oPARAM.PS_SP_PATH,
            "-BaseUrl", oPARAM.BASE_URL,
            "-sapClient", oPARAM.SAP_CLIENT,
            "-sapUser", oPARAM.SAP_USER,
            "-sapPassword", oPARAM.SAP_PW,
            "-spPath", oPARAM.SP_DOWN_PATH,
            "-ndPath", oPARAM.ND_DOWN_PATH,
            "-JsonInput", JSON.stringify(oPARAM.FILE_INFO),
            "-logPath", oPARAM.LOG_FLD_PATH
        ];

        /**
         * @since   2025-12-10 18:01:22
         * @version v3.5.6-17
         * @author  soccerhs
         * @description
         * 
         * 파워쉘로 패치 업데이트용 쉘 실행 시 https 인증서 오류 회피 파라미터 추가
         * 
         */
        if(oPARAM.SKIP_CERT === true){
            aParams.push("-SkipCertificateCheck");
        }

        // PowerShell 프로세스 생성
        const ps = spawn("powershell.exe" ,aParams);

        // 실행 결과 출력
        ps.stdout.on("data", (data) => {

            // 분할 다운로드 수행 횟수에 상관없이 공백이 날라오는 경우가 있음.
            // 테스트 결과 공백일 경우는 리턴해도 수행 해야할 총 횟수에는 영향이 없음.
            if(!data?.toString()?.trim()){                
                return;
            }

            let sData = data?.toString();

            let sLog = `Patch 업데이트 파일 다운로드 중..: ${sData}`;

            /**
             * @since   2025-11-05
             * @version v3.5.6-16
             * @author  soccerhs
             * 
             * @description
             *  [기존] 
             *      - powershell에서 패치 파일 다운로드 진행 중,
             *        Write-Host 출력(stdout)을 다운로드 성공 신호로 인식하여 퍼센트 계산함
             *  [변경]
             *      - stdout 로그 중 단순 로그 용으로 Write-Host를 사용하는 경우가 있어서,
             *        특정 키워드(CHUNK_DOWN_OK) 포함 시에만 다운로드 성공으로 간주하도록 수정함
             */
            if(sData.includes("CHUNK_DOWN_OK") === true){

                // 다운로드 수행 횟수 증가
                oFileInfo.TRANSFERRED++;
            
            } 

            var oRES = JSON.parse(JSON.stringify(TY_RES)); 

            oRES.PRCCD = PRC.DOWN_LOADING; // 다운로드 중
            oRES.PARAM = {
                FILE_INFO: oFileInfo,
                LOG: sLog
            };

            self.postMessage(oRES);            
            
        });

        // 에러 메시지 출력
        ps.stderr.on("data", (data) => {

            let sLog = `Patch 업데이트 다운로드 중 에러: ${data.toString()}`;

            // console.error(sLog);            
            // console.trace();

            // if (!ps.killed) {              
            //     ps.kill();
            //     console.log("kill-1");
            // }

            // return resolve({ SUBRC: 999, LOG: sLog });

            /**
             * @since   2025-11-05
             * @version v3.5.6-16
             * @author  soccerhs
             * 
             * @description
             * - powershell 에서 발생되는 오류 메시지를 받으면 child_process를 중지 시키지 않고 
             *   콘솔 오류만 발생시키는 로직으로 수정함             
             */
            var oRES = JSON.parse(JSON.stringify(TY_RES)); 

            oRES.PRCCD = PRC.UPDATE_ERROR_CONSOLE; // 다운로드 중 콘솔오류 대상
            oRES.PARAM = {
                LOG: sLog
            };

            self.postMessage(oRES);

        });

        // 실행 완료 이벤트 처리
        ps.on("close", (code) => {   

            if (!ps.killed) {              
                ps.kill();
            }

            return resolve({ SUBRC: code });

        });

    });

} // end of _getSuppPackDataFromPowerShell