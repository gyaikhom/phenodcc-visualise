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

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.visualise.entities.KeyValueRecord;

/**
 * Web service for retrieving fertility for a given genotype and parameter.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("viability")
public class ViabilityFacadeREST extends AbstractFacade<KeyValueRecord> {

    public ViabilityFacadeREST() {
        super(KeyValueRecord.class);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public ViabilityPack extjsFindBy(
            @QueryParam("cid") Integer centreId,
            @QueryParam("gid") Integer genotypeId,
            @QueryParam("sid") Integer strainId)
    {
        ViabilityPack p = new ViabilityPack();
        if (centreId == null || genotypeId == null || strainId == null) {
            p.setDataSet(null, 0L);
        } else {
            try {
            EntityManager em = getEntityManager();
            TypedQuery<KeyValueRecord> q = em.createQuery(
                    "SELECT DISTINCT new org.mousephenotype.dcc.visualise.entities.KeyValueRecord(q.parameterKey, q.name, sp.value) FROM Centreprocedure AS cp LEFT JOIN ACentre AS ct ON (ct.shortName = cp.centreid) LEFT JOIN Line AS l ON (l.lineCentreprocedureHjid = cp) LEFT JOIN Genotype AS g ON (g.genotype = l.colonyid) LEFT JOIN ProcedureFromRaw AS p ON (p = l.procedureLineHjid) LEFT JOIN Simpleparameter AS sp ON (sp.simpleparameterProcedureH0 = p) LEFT JOIN Context AS c ON (c.subject = p.hjid) LEFT JOIN Parameter AS q ON (q.parameterKey = sp.parameterid) LEFT JOIN ProcedureHasParameters AS php ON (q = php.parameterId) WHERE ct.centreId = :centreId AND g.genotypeId = :genotypeId AND g.strainId = :strainId AND sp.parameterid like :procedureFrag AND c.isValid = 1 AND c.isActive = 1 ORDER BY php.weight", KeyValueRecord.class);
            q.setParameter("centreId", centreId);
            q.setParameter("genotypeId", genotypeId);
            q.setParameter("strainId", strainId);
            q.setParameter("procedureFrag", "%_VIA_%");
            p.setDataSet(q.getResultList());
            em.close();
            } catch(Exception e) {
                System.err.println(e.getMessage());
            }
        }
        return p;
    }
}
