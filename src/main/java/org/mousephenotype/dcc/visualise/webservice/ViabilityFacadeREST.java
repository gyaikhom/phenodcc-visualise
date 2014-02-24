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

import java.util.ArrayList;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.visualise.entities.KeyValueRecord;
import org.mousephenotype.dcc.visualise.entities.ViabilityData;

/**
 * Web service for retrieving fertility for a given genotype and parameter.
 * 
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("viability")
public class ViabilityFacadeREST extends AbstractFacade<ViabilityData> {

    public ViabilityFacadeREST() {
        super(ViabilityData.class);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public ViabilityPack extjsFindBy(
            @QueryParam("gid") Integer genotypeId) {
        ViabilityPack p = new ViabilityPack();
        if (genotypeId == null) {
            p.setDataSet(null, 0L);
        } else {
            EntityManager em = getEntityManager();
            TypedQuery<KeyValueRecord> q = em.createQuery(
                    "SELECT DISTINCT new org.mousephenotype.dcc.visualise.entities.KeyValueRecord(q.parameterId, sp.value) FROM Genotype g, Line l, ProcedureFromRaw p, Simpleparameter sp, org.mousephenotype.dcc.entities.context.Context c, Parameter q WHERE g.genotypeId = :genotypeId AND g.genotype = l.colonyid AND l.procedureLineHjid = p AND sp.simpleparameterProcedureH0 = p AND p.hjid = c.subject AND c.isValid = 1 AND c.isActive = 1 AND q.parameterKey = sp.parameterid AND sp.parameterid LIKE :procedureFrag", KeyValueRecord.class);
            q.setParameter("genotypeId", genotypeId);
            q.setParameter("procedureFrag", "%_VIA_%");
            List<KeyValueRecord> r = q.getResultList();
            List<ViabilityData> f;
            f = new ArrayList<>();
            f.add(new ViabilityData(r));
            p.setDataSet(f);
            em.close();
        }
        return p;
    }
}
