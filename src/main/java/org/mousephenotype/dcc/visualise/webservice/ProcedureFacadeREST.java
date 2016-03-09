/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import org.mousephenotype.dcc.visualise.persistence.MemcacheHandler;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.impress.Procedure;
import org.mousephenotype.dcc.visualise.entities.ProcedureData;

/**
 * Web service for retrieving procedures.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("procedure")
public class ProcedureFacadeREST extends AbstractFacade<Procedure> {

    private final String REGEX_PROC_KEY = "[A-Z]*_([A-Z]*)_[0-9]*";
    private final Pattern pattern;
    private EntityManager em;

    public ProcedureFacadeREST() {
        super(Procedure.class);
        pattern = Pattern.compile(REGEX_PROC_KEY);
    }

    @GET
    @Path("details/{procedureId}")
    @Produces(MediaType.APPLICATION_JSON)
    public List<String> getProcedureDetails(
            @PathParam("procedureId") Integer procedureId) {
        em = getEntityManager();
        TypedQuery<String> q
                = em.createQuery("SELECT s.sectionText FROM Sop o, Section s WHERE o.procedureId.procedureId = :procedureId AND o = s.sopId AND s.sectionTitleId.id IN (1,2) ORDER BY s.sectionTitleId.weight", String.class);
        q.setParameter("procedureId", procedureId);
        List<String> sections = q.getResultList();
        em.close();
        return sections;
    }

    public List<ProcedureData> getAllProcedures() {
        List<ProcedureData> result = null;
        em = getEntityManager();
        TypedQuery<ProcedureData> q
                = em.createQuery("SELECT DISTINCT new org.mousephenotype.dcc.visualise.entities.ProcedureData(p.procedureId, p.procedureKey, p.name, p.majorVersion, p.minorVersion) FROM Pipeline l join PipelineHasProcedures php on (l = php.pipelineId) join Procedure p on (php.procedureId = p) WHERE l.impc = 1 and (p.procedureId NOT IN (select DISTINCT ip.procedureId FROM IgnoreProcedures ip)) ORDER BY p.name, p.majorVersion, p.minorVersion", ProcedureData.class);
        result = q.getResultList();

        for (ProcedureData d : result) {
            String key = d.getStableid();
            if (key != null && !key.isEmpty()) {
                Matcher m = pattern.matcher(key);
                if (m.find()) {
                    d.setProcedureCode(m.group(1));
                }
            }
        }
        em.close();
        return result;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public ProcedurePack findProcedures() {
        ProcedurePack p = new ProcedurePack();

        MemcacheHandler mh = getMemcacheHandler();
        List<ProcedureData> procedures = mh.getProcedures();
        if (procedures == null) {
            procedures = getAllProcedures();
            mh.setProcedures(procedures);
        }
        p.setDataSet(procedures);
        return p;
    }
}
